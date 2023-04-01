import { Repository, DataSource } from 'typeorm';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { UpdateContactEvent } from '../../events/contact/commands';
import { OutboxService } from '../../outbox/outbox.service';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregateService } from '../services/contact.aggregate.service';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { updateContactProcess } from './update.contact.saga.process';
import { 
  isStepsSuccessful, getSagaResult, 
  updateProcessStatus, setRollbackTrigger 
} from './helpers';
import { ContactQueryService } from '../dbqueries/services/contact.query.service';
import { logStart, logStop } from '../../utils/trace.log';
import { StepResult } from './types/step.result';

const logTrace = false;

// ************************************************************************************
// In the happy path, each step returns a result object that has a data property and 
// processStatus property set. The resultant data and updated process is passed to the 
// next step. This repeats itself for every step there after.
// If one of the steps finds that a previous step(s) failed, it may call for a rollback.
// This step is known as an pivot point. All subsequent steps after the inflection
// point must check if rollback was triggered. If so, each subsequent step must return 
// null data, set step success to false, and leave the rollbackTriggered flag set. 
// ************************************************************************************

@Injectable()
export class UpdateContactSaga {

  constructor(
    private contactAggregateService: ContactAggregateService,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager,
    private outboxService: OutboxService,
    private configService: ConfigService,
    private contactQueryService: ContactQueryService,
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
  ) {}
 
  //***************************************************************************** */
  // Saga Orchestration Steps
  //***************************************************************************** */
  async execute(
    // contactAggregate: ContactAggregate,
    updateContactEvent: UpdateContactEvent
    ): Promise<any> {

    // Initialize process object and step result object
    let updateProcess = { ...updateContactProcess }; /* clone process definition*/
    let result: StepResult = { data: null, processStatus: null }

    // INITIATE SAGA PROCESS
    // =============================================================================
    // STEP 1: LOAD AGGREGATE from the UpdateContactEvent payload; 
    result = await this.loadAggregate(updateProcess, updateContactEvent); /* returns the aggregate */
    let contactAggregate = result.data;
    updateProcess = result.processStatus;

    // =============================================================================
    // STEP 2: GENERATE BEFORE AND AFTER IMAGES
    result = this.generateBeforeAndAfterImages(updateProcess, updateContactEvent, contactAggregate);
    let beforeAfterImages = result.data;
    updateProcess = result.processStatus;

    // =============================================================================
    // STEP 3: APPLY UPDATES TO AGGREGATE
    result = this.applyUpdates(updateProcess, updateContactEvent, contactAggregate);
    let updatedAggregate = result.data;
    updateProcess = result.processStatus;

    // =============================================================================
    // STEP 4: SAVE AGGREGATE
    result = await this.saveAggregate(updateProcess, updatedAggregate);
    let savedAggregate = result.data;
    updateProcess = result.processStatus;

    // =============================================================================
    // STEP 5: GENERATE CONTACT UPDATED EVENT; If domainChangeEvents are not enabled,
    // bypass step by setting success flag to true, otherwise saga would be considered failed.
    let serializedContactUpdateEvent = '';
    if (this.domainChangeEventsEnabled()) { 
      result = this.generateContactUpdatedEvent(updateProcess, updateContactEvent, savedAggregate);
      serializedContactUpdateEvent = result.data;
      updateProcess = result.processStatus;
    } else {
      updateProcess = updateProcessStatus(updateProcess, 'step5', true)  
    }

    // =============================================================================
    // STEP 6: CREATE OUTBOX INSTANCE
    let outboxInstance = null;
    if (this.domainChangeEventsEnabled()) { 
      result = this.createOutboxInstance(updateProcess, updateContactEvent, serializedContactUpdateEvent);
      outboxInstance = result.data;
      updateProcess = result.processStatus;
    } else {
      updateProcess = updateProcessStatus(updateProcess, 'step6', true)  
    }

    // =============================================================================
    // STEP 7: SAVE OUTBOX INSTANCE - this is a Pivot step
    let savedOutboxInstance = null;
    let previousStepsSuccessful = isStepsSuccessful([
      'step1', 'step2', 'step3', 'step4', 'step5', 'step6'
    ], updateProcess);
    if (this.domainChangeEventsNotEnabled()) { /* bypass step by updating successflag to true */
      updateProcess = updateProcessStatus(updateProcess, 'step7', true)    
    } else { 
      /* if previous steps not successful, set rollback trigger */
      if (!previousStepsSuccessful) {  
        updateProcess = setRollbackTrigger(updateProcess)
      } else {  /* otherwise update outbox  */
        result = await this.saveOutboxInstance(updateProcess, outboxInstance);
        savedOutboxInstance = result.data;
        updateProcess = result.processStatus;
      }
    }
    /* if step7 was not successful or rollback was triggered, do rollback */
    if (!updateProcess['step7'].success || updateProcess['rollbackTriggered']) {
      const rollbackMethods = [this.rollbackSaveAggregate]; /* rollback methods in reverse order*/
      await this.rollbackSaga(rollbackMethods)
    }
  
    // =============================================================================
    // STEP 8: TRIGGER OUTBOX - publishes
    result = await this.triggerOutbox(updateProcess, savedAggregate.contact.accountId);
    let publishingCmdResult = result.data; 
    updateProcess = result.processStatus;

    // =============================================================================
    // FINALIZE STEP: LOG ERROR if failure in saga updateProcess
    this.logErrorIfExists(updateProcess)

    // =============================================================================
    // RETRUN SAGA RESPONSE to contact service, which will convert to hypermedia response
    return result;
  }

  //****************************************************************************** */
  // Individual Saga Steps
  //****************************************************************************** */
  
  /**
   * Load Aggregate
   * @param processStatus 
   * @param updateContactEvent 
   * @returns result
   */
  async loadAggregate(processStatus, updateContactEvent: UpdateContactEvent): Promise<StepResult> {
    const methodName = 'loadAggregate'
    logTrace && logStart([methodName, 'processStatus', 'updateContactEvent'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business logic: Create Aggregate  */
    const { header, message } = updateContactEvent;
    const { id, accountId, ...updateProperties }  = message; 
    const aggregate: ContactAggregate = await this.contactAggregateService.getAggregateEntitiesBy(accountId, id);

    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step1', true)

    /* return Result */
    result = { data: aggregate, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generate before and after images from pre-loaded contactAggregate (as before image)
   * and updateContact event (after image).
   * @param processStatus 
   * @param updateContactEvent 
   * @param contactAggregate 
   * @returns result 
   */
  generateBeforeAndAfterImages(processStatus, updateContactEvent, contactAggregate) {
    const methodName = 'generateBeforeAndAfterImages'
    logTrace && logStart([methodName, 'updateRequest', 'aggregate'], arguments)

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Construct updateRequest (properties in the update event) */
    const { header, message } = updateContactEvent;
    const { id, accountId, ...updateProperties }  = message; 
    let updateRequest = { ...updateProperties }; /* separates out update properties only*/

    /* Business logic:  */
    let beforeAfterImages = this.contactAggregateService.generateBeforeAndAfterImages(updateRequest, contactAggregate);

    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step2', true)

    /* return Result */
    result = { data: beforeAfterImages, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  };
  
  applyUpdates(processStatus, updateContactEvent, contactAggregate) {
    const methodName = 'generateBeforeAndAfterImages'
    logTrace && logStart([methodName, 'updateRequest', 'aggregate'], arguments)

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Construct updateRequest (properties in the update event) */
    const { header, message } = updateContactEvent;
    const { id, accountId, ...updateProperties }  = message; 
    let updateRequest = { ...updateProperties }; /* separates out update properties only*/

    /* Business logic:  */
    let updatedAggregate = this.contactAggregateService.applyUpdates(updateRequest, contactAggregate)

    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step3', true)

    /* return Result */
    result = { data: updatedAggregate, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  };
  
  /**
   * Save Aggregate 
   * @param processStatus 
   * @param aggregate 
   * @returns result
   */
  async saveAggregate(processStatus, aggregate: ContactAggregate): Promise<StepResult> {
    const methodName = 'saveAggregate'
    logTrace && logStart([methodName, 'processStatus', 'saveAggregate'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: save aggregate */
    const savedAggregate = await this.contactAggregateService.saveAggregate(aggregate);

    /* Update process success flag */
    if (savedAggregate.contact.id) {   /* checks if id has been appended after update as success check  */
      processStatus = updateProcessStatus(processStatus, 'step4', true)
    }

    /* return Result */
    result = { data: savedAggregate, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generates an domain change updated event. 
   * Note that the domainChangeEventsEnabled flag must be set to publish events.
   * @param updateContactEvent 
   * @param aggregate 
   */
  generateContactUpdatedEvent(
    processStatus,
    updateContactEvent: UpdateContactEvent, 
    aggregate: ContactAggregate): StepResult 
  {
    const methodName = 'generateContactUpdatedEvent';
    logTrace && logStart([methodName, 'updateContactEvent','aggregate'], arguments);

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* extract version from aggregate to pass down to include in updatedConsumerEvent */
    const contact = aggregate.contact;
    const version: number = contact.version;

    /* Business Logic: create serialized contactCreatedEvent */
    const serializedContactUpdatedEvent = this.domainChangeEventFactory.genUpdatedEventFor(updateContactEvent, version);

    /* Update process success flag */
    processStatus = updateProcessStatus(processStatus, 'step5', true)

    /* return Result */
    result = { data: serializedContactUpdatedEvent, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }
   
  /**
   * Returns an outbox instance with the domain change event.
   * @param createContactEvent 
   * @param aggregate 
   */
  createOutboxInstance(
    processStatus,
    updateContactEvent: UpdateContactEvent, 
    serializedContactUpdatedEvent: string) 
  {
    const methodName = 'createOutboxInstance';
    logTrace && logStart([methodName, 'updateContactEvent','serializedContactUpdatedEvent'], arguments);

    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance: ContactOutbox = this.outboxService.generateContactUpdatedInstance(
        updateContactEvent, 
        serializedContactUpdatedEvent
      );

    /* Update process success flag */
    processStatus = updateProcessStatus(processStatus, 'step6', true)
  
    /* return Result */
    result = { data: contactOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  
  /**
   * Save Outbox: this is know as a pivot point (see definition on top of file).
   * @param processStatus 
   * @param contactOutboxInstance 
   * @returns 
   */
  async saveOutboxInstance(processStatus, contactOutboxInstance): Promise<StepResult> {
    const methodName = 'saveOutbox';
    logTrace && logStart([methodName, 'processStatus','contactOutboxInstance'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };
    let savedOutboxInstance: ContactOutbox = null;

    /* Business Logic: If no prior failures, save outbox */
    savedOutboxInstance = await this.outboxService.saveOutboxInstance(contactOutboxInstance)
    if (savedOutboxInstance) { /* if outbox saved, set update result data and processStatus  */
      result.data = savedOutboxInstance;
      processStatus = updateProcessStatus(processStatus, 'step7', true);
      result.processStatus = processStatus;
    } 
    
    /* return result */
    result = { data: savedOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  /**
   * Triggers outbox to publish unpublished events
   * @param processStatus 
   * @param accountId 
   * @returns 
   */
  async triggerOutbox(processStatus, accountId) {
    const methodName = 'triggerOutbox';
    logTrace && logStart([methodName, 'processStatus','accountId'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: Sends command to outbox to publish unpublished events in outbox for a given account */
    const cmdResult: any = await this.domainChangeEventManager.triggerOutboxForAccount(accountId);

    /* update process status */
    processStatus = updateProcessStatus(processStatus, 'step8', true);

    /* return result */
    result = { data: cmdResult, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  //*************************************************************** */
  // Rollback Steps
  //*************************************************************** */

  /**
   * Takes an array of rollback method references, in reverse order 
   * @param rollbackMethods 
   */
  async rollbackSaga(rollbackMethods) {
    // If any steps failed, rollback in reverse order
    

    /* process rollbacks in reverse  */
    // rollbackMethods.forEach(async (method)=> {
    //   /* execute rollback */
    //   // await method()
    // })
    // let rollBackResult = await 
    // call finalize
  }
  
  // Rollback Save Aggregate 
  async rollbackSaveAggregate() {
    // ROLLING BACK SHOULD CONSIST OF LOADING(FETCHING) AGGREGATE
    // AND DELETING EACH OF THE RELATIONS IN A SINGLE TRANSACTION
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK SAVED AGGREGATE")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
  }

  // Save outbox compensation 
  async rollbackSaveOutbox() {
    /* update step status */
  }

  async setRollbackTrigger(processUpdate) {
    processUpdate = { ... processUpdate }
    /* update step status */
  }

  //*************************************************************** */
  // Helper Methods
  //*************************************************************** */
  /**
   * Returns config parm 'PUBLISH_DOMAIN_CHANGE_EVENTS' as boolean
   * @returns 
   */
  domainChangeEventsEnabled(): boolean {
    const domainChangeEventsEnabled = this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS');
    if (domainChangeEventsEnabled === 'true' )  { return true;  } 
    if (domainChangeEventsEnabled === 'false' )  { return false; } 
  }
  domainChangeEventsNotEnabled(): boolean {
    return !this.domainChangeEventsEnabled()
  }
  
  /**
   * Used as last step of the Saga to log an error if it occurred
   * @param processStatus 
   */
  logErrorIfExists (processStatus) {
    const sagaResult = getSagaResult(processStatus);
    const { sagaSuccessful, sagaFailureReason } = sagaResult;
    if (!sagaSuccessful) {
      console.log("ERROR ",JSON.stringify(sagaResult,null,2))
    }
  }
  
}
  
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { CreateContactEvent } from '../../events/contact/commands';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactTransaction } from './../transactions';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregateService } from '../services/contact.aggregate.service';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { process } from './create.contact.saga.process';
import { 
  isStepsSuccessful, getSagaResult, 
  updateProcessStatus, setRollbackTriggered 
} from './helpers';
import { logStart, logStop } from '../../utils/trace.log';
import { StepResult } from './types/step.result';

const logTrace = false;

// ************************************************************************************
// In the happy path, each step returns a result object that has a data property and 
// processStatus property set. The resultant data and updated process is passed to the 
// next step. This repeats itself for every step there after.
// If one of the steps finds that a previous step(s) failed, it may call for a rollback.
// This step is known as an inflection point. All subsequent steps after the inflection
// point must check if rollback was triggered. If so, each subsequent step must return 
// null data, set step success to false, and leave the rollbackTriggered flag set. 
// ************************************************************************************

@Injectable()
export class CreateContactSaga {

  constructor(
    private contactAggregateService: ContactAggregateService,
    private createContactTransaction: CreateContactTransaction,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager,
    private outboxService: OutboxService,
    private configService: ConfigService
  ) {}
 
  //***************************************************************************** */
  // Saga Orchestration Steps
  //***************************************************************************** */
  async execute(
    // contactAggregate: ContactAggregate,
    createContactEvent: CreateContactEvent
    ): Promise<any> {

    // Initialize process object and step result object
    let createContactProcess = { ...process }; /* clone process definition*/
    let result: StepResult = { data: null, processStatus: null }

    // INITIATE SAGA PROCESS
    // =============================================================================
    // STEP 1: CREATE AGGREGATE from the CreateContactEvent payload; 
    result = await this.createAggregate(createContactProcess, createContactEvent); /* returns the aggregate */
    const contactAggregate = result.data;
    createContactProcess = result.processStatus;

    // =============================================================================
    // STEP 2: SAVE AGGREGATE
    result = await this.saveAggregate(createContactProcess, contactAggregate);
    const savedAggregate = result.data;
    createContactProcess = result.processStatus;

    // =============================================================================
    // STEP 3: GENERATE CREATED EVENT; if domainChange events 
    result = await this.generateCreatedEvent(createContactProcess, createContactEvent, savedAggregate);
    let serializedCreatedEvent = result.data 
    createContactProcess = result.processStatus

    // =============================================================================
    // STEP 4: CREATE OUTBOX INSTANCE: If domainChange events are disabled, 
    result = await this.createOutboxInstance(createContactProcess, createContactEvent, serializedCreatedEvent);
    let outboxInstance = result.data; 
    createContactProcess = result.processStatus;

    // =============================================================================
    // STEP 5: SAVE OUTBOX
    result = await this.saveOutbox(createContactProcess, outboxInstance);
    let savedOutboxInstance = result.data; 
    createContactProcess = result.processStatus;
  
    // =============================================================================
    // STEP 6: TRIGGER OUTBOX 
    result = await this.triggerOutbox(createContactProcess, savedAggregate.contact.accountId);
    let publishingCmdResult = result.data; 
    createContactProcess = result.processStatus;

    // =============================================================================
    // FINALIZE STEP: LOG ERROR if saga was not successful
    const sagaResult = getSagaResult(createContactProcess);
    const { sagaSuccessful, sagaFailureReason } = sagaResult;
    if (!sagaSuccessful) {
      console.log("ERROR ",JSON.stringify(sagaResult,null,2))
    }

    // =============================================================================
    // RETRUN SAGA RESPONSE to contact service, which will convert to hypermedia response
    return savedAggregate;
  }

  //****************************************************************************** */
  // Individual Saga Steps
  //****************************************************************************** */
  
  /**
   * Create Aggregate
   * @param processStatus 
   * @param createContactEvent 
   * @returns result
   */
  async createAggregate(processStatus, createContactEvent: CreateContactEvent): Promise<StepResult> {
    const methodName = 'createAggregate'
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };
    /* Business logic: Create Aggregate  */
    const contactAggregate = await this.contactAggregateService.createAggregate(createContactEvent);
    /* Update process success based on result */
    processStatus = updateProcessStatus(processStatus, 'step1', true)

    /* return Result */
    result = { data: contactAggregate, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

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

    /* Update process as successful */
    if (savedAggregate.contact.id) {   /* checks if id has been appended after update as success check  */
      processStatus = updateProcessStatus(processStatus, 'step2', true)
    }

    /* return Result */
    result = { data: savedAggregate, processStatus }
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Generate Created event
   * @param processStatus 
   * @param createContactEvent 
   * @param savedAggregate 
   * @returns result
   */
  generateCreatedEvent(processStatus, createContactEvent: CreateContactEvent, savedAggregate: ContactAggregate): StepResult {
    const methodName = 'generateCreatedEvent'
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent', 'savedAggregate'], arguments)
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* bypass create generating creating event if domainChangeEvents disabled */
    if (!this.domainChangeEventsEnabled()) { return result; };

    /* Business Logic: create serialized contactCreatedEvent */
    const serializedCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
      createContactEvent, savedAggregate
    );
    /* Update process as successful */
    processStatus = updateProcessStatus(processStatus, 'step3', true)

    /* Return Result */
    result = { data: serializedCreatedEvent, processStatus };
    logTrace && logStop(methodName, 'result', result)
    return result;
  }

  /**
   * Create Outbox Instance
   * @param processStatus 
   * @param createContactEvent 
   * @param serializedContactCreatedEvent 
   * @returns result
   */
  async createOutboxInstance(
    processStatus: any,
    createContactEvent: CreateContactEvent,
    serializedContactCreatedEvent: string): Promise<StepResult> 
  {
    const methodName = 'createOutboxInstance';
    logTrace && logStart([methodName, 'processStatus', 'createContactEvent','serializedContactCreatedEvent'], arguments);
   
    /* If flag is disabled to publish domain change events, return null */
    if (!this.domainChangeEventsEnabled()) { return null; };
     
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Check prior step status */
    let previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3'], process);

    /* Business Logic: create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance = null;
    if (previousStepsSuccessful) { 
      contactOutboxInstance = await this.outboxService.createContactCreatedInstance(
        createContactEvent, 
        serializedContactCreatedEvent
      );
    }

    /* update process status */
    if (previousStepsSuccessful && contactOutboxInstance) {
      processStatus = updateProcessStatus(processStatus, 'step4', true)
    }

    /* return result */
    result = { data: contactOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }
  
  /**
   * Save Outbox: this is an inflection point (see definition on top of file).
   * @param processStatus 
   * @param contactOutboxInstance 
   * @returns 
   */
  async saveOutbox(processStatus, contactOutboxInstance): Promise<StepResult> {
    const methodName = 'saveOutbox';
    logTrace && logStart([methodName, 'processStatus','contactOutboxInstance'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };
    let savedOutboxInstance: ContactOutbox = null;

    /* bypass creating event if domainChangeEvents disabled. Bypassing is considered successful */
    if (!this.domainChangeEventsEnabled()) { 
      processStatus = updateProcessStatus(processStatus, 'step5', true)
      result.processStatus = processStatus;
      return result; 
    };

    /* Business Logic: If no prior failures, save outbox */
    let previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3', 'step4'], process);
    if (previousStepsSuccessful) {
      savedOutboxInstance = await this.outboxService.saveOutboxInstance(contactOutboxInstance)
      if (savedOutboxInstance) { /* if outbox saved, set update result data and processStatus  */
        result.data = savedOutboxInstance;
        processStatus = updateProcessStatus(processStatus, 'step5', true);
        result.processStatus = processStatus;
      } 
    } 
    /* If save outbox returned null(failed) or any previous steps failed, do a rollback */
    if (!previousStepsSuccessful || !savedOutboxInstance) {      
      const rollbackMethods = [this.rollbackSaveAggregate];
      await this.rollbackSaga(rollbackMethods)
      processStatus = setRollbackTriggered(processStatus)
    }
    
    /* return result */
    result = { data: savedOutboxInstance, processStatus }
    logTrace && logStop(methodName, 'result', result);
    return result;
  }

  async triggerOutbox(processStatus, accountId) {
    const methodName = 'triggerOutbox';
    logTrace && logStart([methodName, 'processStatus','accountId'], arguments);
    /* Intialize result object */
    let result: StepResult = { data: null, processStatus: null };

    /* Business Logic: Sends command to outbox to publish unpublished events in outbox for a given account */
    const cmdResult: any = await this.domainChangeEventManager.triggerOutboxForAccount(accountId);

    /* update process status */
    processStatus = setRollbackTriggered(processStatus)

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
    
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK SAGA")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
      

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
    console.log("ROLLBACK SAVE AGGREGATE")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
  }

  // Save outbox compensation 
  async rollbackSaveOutbox() {

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
  
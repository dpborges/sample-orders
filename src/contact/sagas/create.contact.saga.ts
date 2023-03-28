import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { CreateContactEvent } from '../../events/contact/commands';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactTransaction } from './../transactions';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { ConfigService } from '@nestjs/config';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregateService } from '../services/contact.aggregate.service';
import { process } from './create.contact.saga.process';
import { 
  isStepsSuccessful, getSagaResult, 
  updateProcessStatus, setRollbackTriggered 
} from './helpers';
import { logStart, logStop } from '../../utils/trace.log';

const logTrace = true;

@Injectable()
export class CreateContactSaga {

  constructor(
    private contactAggregateService: ContactAggregateService,
    private createContactTransaction: CreateContactTransaction,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private outboxService: OutboxService,
    private configService: ConfigService
  ) {}
 
  //*************************************************************** */
  // Saga Orchestration Steps
  //*************************************************************** */
  async execute(
    // contactAggregate: ContactAggregate,
    createContactEvent: CreateContactEvent
    ): Promise<any> {

    // Initialize process
    let createContactProcess = { ...process }; /* clone process definition*/

    // PROCESS SAGA
    // STEP 1: Create Aggregate from the CreateContactEvent payload; 
    const contactAggregate = await this.contactAggregateService.createAggregate(createContactEvent);
    createContactProcess = updateProcessStatus(createContactProcess, 'step1', true)

    // STEP 2: Save Aggregate
    const savedAggregate = await this.saveAggregate(contactAggregate);
    if (savedAggregate.contact.id) {   /* checks if id has been appended after update */
      createContactProcess = updateProcessStatus(createContactProcess, 'step2', true)
    }
    
    // STEP 3: Generate Created Event; if domainChange events 
    //  are disabled, serializedCreateEvent will be empty string but step would be flagged as sucessful
    let serializedCreatedEvent = '';
    let previousStepsSuccessful = isStepsSuccessful(['step1', 'step2'], createContactProcess);
    if (previousStepsSuccessful) { 
      serializedCreatedEvent = this.generateCreatedEvent(createContactEvent, savedAggregate);
      createContactProcess = updateProcessStatus(createContactProcess, 'step3', true)
    }

    // STEP 4: Create Outbox Instance: If domainChange events are disabled, 
    //  outboxInstance will be null but step would be flagged as sucessful
    let outboxInstance = null;
    previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3'], createContactProcess);
    if (previousStepsSuccessful) { 
      outboxInstance = await this.createOutboxInstance(createContactEvent, serializedCreatedEvent);
      createContactProcess = updateProcessStatus(createContactProcess, 'step4', true)
    }
    
    // STEP 5: Save Outbox 
    /* Check that all prior steps were successful */
    previousStepsSuccessful = isStepsSuccessful(['step1', 'step2', 'step3', 'step4'], createContactProcess);
    if (!previousStepsSuccessful) {
      const rollbackMethods = [this.rollbackSaveAggregate];
      await this.rollbackSaga(rollbackMethods)
    } 
    /* continue here if prior steps were successful and domain change events are enabled. If
     domainChanges are enabled but save to outbox fails, it will rollback  */
    if (this.domainChangeEventsEnabled()) {
      const savedOutboxInstance = await this.saveOutbox(outboxInstance);
      if (!savedOutboxInstance) { /* rollback if saveOutbox failed */
        const rollbackMethods = [this.rollbackSaveAggregate];
        await this.rollbackSaga(rollbackMethods)
        createContactProcess = setRollbackTriggered(createContactProcess)
      } else {
        createContactProcess = updateProcessStatus(createContactProcess, 'step5', true)
      }
    } else { /* if domainChangeEvents were not enabled just flag step as successful */
      createContactProcess = updateProcessStatus(createContactProcess, 'step5', true)
    }

    // TRIGGER OUTBOX HERE
    // BEFORE DOING SO, COMMENT OUT ContactCreateListener in controller

    // FINALIZE: Capture saga result. If error,  console log failure reason
    const sagaResult = getSagaResult(createContactProcess);
    const { sagaSuccessful, sagaFailureReason } = sagaResult;
    console.log("ERROR ",JSON.stringify(sagaResult,null,2))

    // Return saga response to contact service, which will convert to hypermedia response
    return savedAggregate;
  }

  //*************************************************************** */
  // Individual saga transactions
  //*************************************************************** */
  
  //Step 2: Save Aggregate 
  async saveAggregate(aggregate: ContactAggregate) {
    const methodName = 'saveAggregate'
    logTrace && logStart([methodName, 'saveAggregate'], arguments)
    /* save aggregate */
    const savedAggregate = await this.contactAggregateService.saveAggregate(aggregate);
    logTrace && logStop(methodName, 'saveAggregate', savedAggregate)
    return savedAggregate;
  }

  // Step 3: Generate Created event
  generateCreatedEvent(createContactEvent: CreateContactEvent, savedAggregate: ContactAggregate) {
    /* bypass create generating creating event if domainChangeEvents disabled */
    if (!this.domainChangeEventsEnabled()) { return null; };
   
    /* create serialized contactCreatedEvent */
    const serializedCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
      createContactEvent, savedAggregate
    );
    return serializedCreatedEvent;
  }

  //Step4:  Create Outbox Instance
  async createOutboxInstance(
    createContactEvent: CreateContactEvent,
    serializedContactCreatedEvent: string) 
    // aggregate: ContactAggregate)
  {
    const methodName = 'createOutboxInstance';
    logTrace && logStart([methodName, 'createContactEvent','serializedContactCreatedEvent'], arguments);
   
    /* If flag is disabled to publish domain change events, return null */
    if (!this.domainChangeEventsEnabled()) { return null; };
     
    /* create Outbox Instance of contactCreatedEvent, from createContactEvent */
    const contactOutboxInstance = await this.outboxService.createContactCreatedInstance(
      createContactEvent, 
      serializedContactCreatedEvent
    );

    logTrace && logStop(methodName, 'contactOutboxInstance', contactOutboxInstance);
    return contactOutboxInstance;
  }

  // Step 4: Save outbox instancee
  async saveOutbox(contactOutboxInstance) {
    /*  Save Logic Here */
    const savedOutbox: ContactOutbox = await this.outboxService.saveOutboxInstance(contactOutboxInstance)
    return savedOutbox;
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
    // 
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    console.log("ROLLBACK SET AGGREGATE")
    console.log('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
    /* update step status */
  }

  // Save outbox compensation 
  async rollbackSaveOutbox() {

    /* update step status */
  }

  //*************************************************************** */
  // Get Result
  //*************************************************************** */
  // return primary result or error response
  // getSagaResult(process): any {
  //   type FirstFailure = { step: string, name: string };
  //   let updatedProcess = { ...process }
  //   let firstFailure: FirstFailure = this.getFirstFailedStep(updatedProcess);
  //   let failureOccurred = firstFailure.step ? true : false;
  //   if (failureOccurred || process.rollbackTriggered) {
  //     updatedProcess.sagaSuccessful = false;
  //     let { step, name } = firstFailure;
  //     updatedProcess.sagaFailureReason = `Process failed at step ${step}: ${name}`
  //   }
  //   return updatedProcess;
  // }

  //*************************************************************** */
  // Domain Creation Helper Methods
  //*************************************************************** */
  domainChangeEventsEnabled(): boolean {
    const domainChangeEventsEnabled = this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS');
    if (domainChangeEventsEnabled === 'true' )  { return true;  } 
    if (domainChangeEventsEnabled === 'false' )  { return false; } 
  }

  //*************************************************************** */
  // Saga Helper methods
  //*************************************************************** */

  /**
   * Returns the first failed step in the saga
   * @param process 
   */
  // getFirstFailedStep(process) {
  //    /* extract process keys */
  //    const processKeys = Object.keys(process);
  //    /* extract keys that start with step */
  //    const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
     
  //    let firstFailedStep = '';
  //    let firstFailedName = '';
  //    let foundFirstFailure = false;
  //    stepKeys.forEach((key) =>  {
  //      if (process[key].success === false && !foundFirstFailure) {
  //        firstFailedStep = key;
  //        firstFailedName = process[key].name;
  //        foundFirstFailure = true;
  //      }
  //    });
  //    const firstFailure = { step: firstFailedStep, name: firstFailedName}; 
  //    return firstFailure;
  // }

  /**
   * Returns object with step and success flag; used for debugging
   * @param process 
   * @returns stepStatus
   */
  // getStepStatus(process) {
  //   const processKeys = Object.keys(process);
  //   /* extract keys that start with step */
  //   const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
  //   /* create object with all the steps/success */
  //   let stepStatus = {}
  //   stepKeys.forEach((key) => stepStatus[key] = {
  //     name: process[key].name,
  //     success: process[key].success
  //   })
  //   return stepStatus;
  // }

  // setStepStatus(step, successValue: boolean) {
  //   let stepObject = this.process[step];
  //   let objectCopy = { ...stepObject }
  //   objectCopy.success = successValue;
  //   this.process[step] = objectCopy;
  //   /* update last step processed */
  //   this.lastStepProcessed = step;
  // }
  // getStepStatus(step) {
  //   let theStep = this.process[step];
  //   return theStep.success;
  // }

  // getStepSequenceNumberFor(step) {
  //   let theStep = this.process[step];
  //   return theStep.seq;
  // }
  /**
   * Update current step status
   * @param process contains state of the process
   * @param step    step name (eg. 'step1')
   * @param success provides whether process step completed successful
   * @returns updatedProcess
   */
  // updateProcessStatus(process, step:string, success: boolean) {
  //   let processCopy = { ...process };
  //   processCopy[step].success = success;  /* assign success status */
  //   return processCopy;
  // }
   /**
   * Set rollbackTriggered flag
   * @param process contains state of the process
   * @param step    step name (eg. 'step1')
   * @param success provides whether process step completed successful
   * @returns updatedProcess
   */
  //  setRollbackTriggered(process) {
  //   let processCopy = { ...process };
  //   processCopy.rollbackTriggered = true;   
  //   return processCopy;
  // }
}
  
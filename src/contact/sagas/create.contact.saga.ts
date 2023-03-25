import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { CreateContactEvent } from '../../events/contact/commands';
import { SaveOutboxTransaction } from '../../outbox/transactions/save.outbox.transaction';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactTransaction } from './../transactions';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { Injectable, Inject } from '@nestjs/common';
import { process } from './create.contact.saga.process';
import { logStart, logStop } from '../../utils/trace.log';

const logTrace = true;

@Injectable()
export class CreateContactSaga {

  constructor(
    private createContactTransaction: CreateContactTransaction,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private outboxService: OutboxService,
    private saveOutBoxTransaction: SaveOutboxTransaction,
    // private contactAggregate: ContactAggregate,
    // private customNatsClient: CustomNatsClient,
    // private configService: ConfigService,
    // private outboxService: OutboxService,
    // private domainChangeEventFactory: DomainChangeEventFactory,
    // private domainChangeEventManager: DomainChangeEventManager, 
    // private contactSaveService: ContactSaveService,
    // @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {
    /* set domainChangeEventsEnabled flag */
    // if (this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS') === "true") {
    //   this.domainChangeEventsEnabled = true ;
    // }
  }
 
  //*************************************************************** */
  // Saga Orchestration Steps
  //*************************************************************** */
  async execute(
    contactAggregate: ContactAggregate,
    createContactEvent: CreateContactEvent
    ): Promise<any> {

    // Initialize process
    let createContactProcess = { ...process }; /* clone process */

    // Process Saga 
    // Step 1: Save Aggregate
    const savedAggregate = await this.saveAggregate(contactAggregate);
    if (savedAggregate.contact.id) {   /* checks if id has been appended after update */
      createContactProcess = this.updateProcessStatus(createContactProcess, 'step1', true)
    }
    
   
    // Step 2: Generate Created Event 
    // await this.generateCreatedEvent(createContactEvent)

    // Step3: Create Outbox Instance
    // await this.createdOutboxInstance(createContactEvent, this.aggregate)

    // Step4: Save Outbox 
    // await this.saveOutbox(this.contactOutboxInstance)

    // Call finalize, which returns 
    const sagaResult = this.getSagaResult(createContactProcess);
    console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP')
    console.log("SAGA RESULT ",JSON.stringify(createContactProcess,null,2))
    console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP');
    // return finalResult;

    return savedAggregate;
  }

  //*************************************************************** */
  // Individual saga transactions
  //*************************************************************** */
  
  //Step 1: Save Aggregate 
  async saveAggregate(aggregate: ContactAggregate) {
    const methodName = 'saveAggregate'
    logTrace && logStart([methodName, 'saveAggregate'], arguments)
    /* save aggregate */
    const savedAggregate = await this.createContactTransaction.create(aggregate);
    logTrace && logStop(methodName, 'saveAggregate', savedAggregate)
    return savedAggregate;
  }

  // Step 2: Generate Created event
  // generateCreatedEvent(createContactEvent) {
  //   /* check previous step status and sets lastStepProcess */
  //   const previousStepSuccessful = this.getStepStatus('step1')
  //   if (!previousStepSuccessful) {
  //     return;  
  //   } else {
  //     /* extract version from aggregate to pass down to include in domainCreated event */
  //     const contact = this.aggregate.contact;
  //     const version: number = contact.version;

  //     /* create serialized contactCreatedEvent */
  //     this.serializedCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
  //       createContactEvent, version
  //     );

  //     /* update step success status only when true (as sucess is false by default). 
  //       This will also set lastStepProcessed  */
  //     this.setStepStatus('step2', true);
  //   }
  // }

  //Step3:  Create Outbox Instance
  // async createdOutboxInstance(
  //   createContactEvent: CreateContactEvent, 
  //   aggregate: ContactAggregate)
  // {
  //   const methodName = 'createdOutboxInstance';
  //   logTrace && logStart([methodName, 'createContactEvent','aggregate'], arguments);
    
  //   /* if previous step was not successful, return */
  //   const previousStepSuccessful = this.getStepStatus('step2')
  //   if (!previousStepSuccessful) { return;  } 

  //   /* If flag is disabled to publish domain change events, return */
  //   if (!this.domainChangeEventsEnabled) {  
  //     return;  
  //   } 
  //   /* extract version from aggregate to pass down to include in domainCreated event */
  //   const contact = aggregate.contact;
  //   const version: number = contact.version;

  //   /* create serialized contactCreatedEvent */
  //   const serializedContactCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
  //     createContactEvent, version
  //   );
  
  //   /* create Outbox Instance of contactCreatedEvent, from createContactEvent */
  //   this.contactOutboxInstance = await this.outboxService.generateContactCreatedInstances(
  //         createContactEvent, 
  //         serializedContactCreatedEvent
  //       );

  //   /* update step success status only when true (as sucess is false by default). 
  //     This will also set lastStepProcessed  */
  //   this.setStepStatus('step3', true);

  //   logTrace && logStop(methodName, 'contactOutboxInstance', this.contactOutboxInstance);
    
  // }


  // Step 4: Save outbox instancee
  // async saveOutbox(createOutboxInstance) {
  //   const previousStepSuccessful = this.getStepStatus('step3')
  //   if (!previousStepSuccessful) {
  //     /* provide rollbacks in reverse order */
  //     const result = await this.rollbackTransactions(['step1']);
  //   } 
  //   /*  Save Logic Here */
  //   const result: any = await this.saveOutBoxTransaction.save(this.contactOutboxInstance)
  //   console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")
  //   console.log("save outbox result ", result)
  //   console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")

  //   /* update step success status only when true (as sucess is false by default). 
  //    This will also set lastStepProcessed  */


  //   // update step status 
  // }
  

  //*************************************************************** */
  // Rollback Steps
  //*************************************************************** */

  /**
   * Takes an array of a seqence of steps in reverse order (eg ['step2', 'step1', etc]) 
   * @param stepSequence 
   */
  // async rollbackTransactions(stepSequence) {
  //   // If any steps failed, rollback in reverse order

  //   // Define rollBackMethods array
  //   const rollBackMethods = [
  //     this.rollbackSaveAggregate
  //   ]

  //   /* set rollback flag */
  //   this.rollBackTriggered = true;
  //   /* process rollbacks in reverse  */
  //   stepSequence.forEach(async (step)=> {
  //     let num = this.getStepSequenceNumberFor(step);
  //     /* execute rollback */
  //     await rollBackMethods[num]
  //   })
  
   
  //   // let rollBackResult = await 
  //   // call finalize
  // }
  
  // Rollback Save Aggregate 
  async rollbackSaveAggregate() {
    // 

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
  getSagaResult(process): any {
    type FirstFailure = { step: string, name: string };
    let updatedProcess = { ...process }
    let firstFailure: FirstFailure = this.getFirstFailedStep(updatedProcess);
    let failureOccurred = firstFailure.step ? true : false;
    if (failureOccurred || process.rollbackTriggered) {
      updatedProcess.sagaSuccessful = false;
      let { step, name } = firstFailure;
      updatedProcess.sagaFailureReason = `Process failed at step ${step}: ${name}`
      return true;
    }
    return updatedProcess;
  }

  //*************************************************************** */
  // Domain Creation Helper Methods
  //*************************************************************** */



  //*************************************************************** */
  // Saga Helper methods
  //*************************************************************** */

  /**
   * Returns the first failed step in the saga
   * @param process 
   */
  getFirstFailedStep(process) {
     const processKeys = Object.keys(process);
     /* extract keys that start with step */
     console.log("PROCESS KEYS ", processKeys)
     const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
     console.log("STEP KEYS ", stepKeys)
     
     let firstFailedStep = '';
     let firstFailedName = '';
     let foundFirstFailure = false;
     stepKeys.forEach((key) =>  {
       if (process[key].success === false && !foundFirstFailure) {
         firstFailedStep = key;
         firstFailedName = process[key].name;
         foundFirstFailure = true;
       }
     });
     const firstFailure = { step: firstFailedStep, name: firstFailedName}; 
     return firstFailure;
  }

  /**
   * Returns object with step and success flag; used for debugging
   * @param process 
   * @returns stepStatus
   */
  getStepStatus(process) {
    const processKeys = Object.keys(process);
    /* extract keys that start with step */
    const stepKeys = processKeys.filter((processKey) => processKey.startsWith('step'));
    /* create object with all the steps/success */
    let stepStatus = {}
    stepKeys.forEach((key) => stepStatus[key] = {
      name: process[key].name,
      success: process[key].success
    })
    return stepStatus;
  }



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
   * Update current state of process
   * @param process contains state of the process
   * @param step    step name (eg. 'step1')
   * @param success provides whether process step completed successful
   * @returns updatedProcess
   */
  updateProcessStatus(process, step:string, success: boolean) {
    let processCopy = { ...process };
    processCopy[step] = success;             /* assign success status */
    if (processCopy[step].success) {         /* if successful, update lastStepCompleted */
      processCopy.lastStepCompleted = step;
    }
    return processCopy;
  }
}
  
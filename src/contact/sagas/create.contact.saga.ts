import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { CreateContactEvent } from '../../events/contact/commands';
import { SaveOutboxTransaction } from '../../outbox/transactions/save.outbox.transaction';
import { OutboxService } from '../../outbox/outbox.service';
import { CreateContactTransaction } from './../transactions';
import { ContactAggregate } from '../types'
import { DomainChangeEventFactory } from '../services/domain.change.event.factory';
import { Injectable, Inject } from '@nestjs/common';
import { logStart, logStop } from '../../utils/trace.log';

const logTrace = true;

@Injectable()
export class CreateContactSaga {

  private domainChangeEventsEnabled: boolean = false;

  private process = {
    step1: { seq: 0, name: 'saveAggregate',         success: false },
    step2: { seq: 1, name: 'generateCreatedEvent',  success: false },
    step3: { seq: 2, name: 'createdOutboxInstance', success: false },
    step4: { seq: 3, name: 'saveOutbox',            success: false }
  }
  private lastStepProcessed = 'None';
  
  //Rollback status
  private rollBackTriggered = false;
  private rollBackSuccess   = true;

  // Intermediate Results
  private serializedCreatedEvent: string;
  private contactOutboxInstance: ContactOutbox;
  // Final Result
  private aggregate: ContactAggregate = null;
  
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
  // Create Contact Saga Orchestration
  //*************************************************************** */
  async execute(
    contactAggregate: ContactAggregate,
    createContactEvent: CreateContactEvent
    ): Promise<any> {

    // Process Saga 
    // Step 1: Save Aggregate
    await this.saveAggregate(contactAggregate);
   
    // Step 2: Generate Created Event 
    await this.generateCreatedEvent(createContactEvent)

    // Step3: Create Outbox Instance
    await this.createdOutboxInstance(createContactEvent, this.aggregate)

    // Step4: Save Outbox 
    await this.saveOutbox(this.contactOutboxInstance)

    // Call finalize
    const finalResult: any = await this.finalize()
    return finalResult;
  }

  //*************************************************************** */
  // Individual saga transactions
  //*************************************************************** */
  
  //Step 1: Save Aggregate 
  async saveAggregate(aggregate) {
    /* save aggregate */
    this.aggregate = await this.createContactTransaction.create(aggregate);
    /* update step success status only when true (as success is false by default). 
    Call setStepStatus will also set lastStepProcessed  */
    if (aggregate.contact) { this.setStepStatus('step1', true) };
  }

  // Step 2: Generate Created event
  generateCreatedEvent(createContactEvent) {
    /* check previous step status and sets lastStepProcess */
    const previousStepSuccessful = this.getStepStatus('step1')
    if (!previousStepSuccessful) {
      return;  
    } else {
      /* extract version from aggregate to pass down to include in domainCreated event */
      const contact = this.aggregate.contact;
      const version: number = contact.version;

      /* create serialized contactCreatedEvent */
      this.serializedCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
        createContactEvent, version
      );

      /* update step success status only when true (as sucess is false by default). 
        This will also set lastStepProcessed  */
      this.setStepStatus('step2', true);
    }
  }

  //Step3:  Create Outbox Instance
  async createdOutboxInstance(
    createContactEvent: CreateContactEvent, 
    aggregate: ContactAggregate)
  {
    const methodName = 'createdOutboxInstance';
    logTrace && logStart([methodName, 'createContactEvent','aggregate'], arguments);
    
    /* if previous step was not successful, return */
    const previousStepSuccessful = this.getStepStatus('step2')
    if (!previousStepSuccessful) { return;  } 

    /* If flag is disabled to publish domain change events, return */
    if (!this.domainChangeEventsEnabled) {  
      return;  
    } 
    /* extract version from aggregate to pass down to include in domainCreated event */
    const contact = aggregate.contact;
    const version: number = contact.version;

    /* create serialized contactCreatedEvent */
    const serializedContactCreatedEvent = this.domainChangeEventFactory.genCreatedEventFor(
      createContactEvent, version
    );
  
    /* create Outbox Instance of contactCreatedEvent, from createContactEvent */
    this.contactOutboxInstance = await this.outboxService.generateContactCreatedInstances(
          createContactEvent, 
          serializedContactCreatedEvent
        );

    /* update step success status only when true (as sucess is false by default). 
      This will also set lastStepProcessed  */
    this.setStepStatus('step3', true);

    logTrace && logStop(methodName, 'contactOutboxInstance', this.contactOutboxInstance);
    
  }


  // Step 4: Save outbox instancee
  async saveOutbox(createOutboxInstance) {
    const previousStepSuccessful = this.getStepStatus('step3')
    if (!previousStepSuccessful) {
      /* provide rollbacks in reverse order */
      const result = await this.rollbackTransactions(['step1']);
    } 
    /*  Save Logic Here */
    const result: any = await this.saveOutBoxTransaction.save(this.contactOutboxInstance)
    console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")
    console.log("save outbox result ", result)
    console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC")

    /* update step success status only when true (as sucess is false by default). 
     This will also set lastStepProcessed  */


    // update step status 
  }
  

  //*************************************************************** */
  // Rollback Steps
  //*************************************************************** */

  /**
   * Takes an array of a seqence of steps in reverse order (eg ['step2', 'step1', etc]) 
   * @param stepSequence 
   */
  async rollbackTransactions(stepSequence) {
    // If any steps failed, rollback in reverse order

    // Define rollBackMethods array
    const rollBackMethods = [
      this.rollbackSaveAggregate
    ]

    /* set rollback flag */
    this.rollBackTriggered = true;
    /* process rollbacks in reverse  */
    stepSequence.forEach(async (step)=> {
      let num = this.getStepSequenceNumberFor(step);
      /* execute rollback */
      await rollBackMethods[num]
    })
  
   
    // let rollBackResult = await 
    // call finalize
  }
  
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
  // Finalize Step
  //*************************************************************** */
  // return primary result or error response
  finalize() {
    let response: any;
    if (this.rollBackTriggered) {
      // construct error response here
   
    } 

    const aggregate: ContactAggregate = this.aggregate;
    return aggregate;

  }

  //*************************************************************** */
  // Domain Creation Helper Methods
  //*************************************************************** */



  //*************************************************************** */
  // Saga Helper methods
  //*************************************************************** */

  setStepStatus(step, successValue: boolean) {
    let stepObject = this.process[step];
    let objectCopy = { ...stepObject }
    objectCopy.success = successValue;
    this.process[step] = objectCopy;
    /* update last step processed */
    this.lastStepProcessed = step;
  }
  getStepStatus(step) {
    let theStep = this.process[step];
    return theStep.success;
  }

  getStepSequenceNumberFor(step) {
    let theStep = this.process[step];
    return theStep.seq;
  }

}
  
import { Repository, DataSource } from 'typeorm';
import { RepoToken } from '../../db-providers/repo.token.enum';
// import { UpdateContactResponse } from '../responses/update.contact.response';
import { ConfigModule } from '@nestjs/config';
import { OutboxService } from './../../outbox/outbox.service';
import { CreateContactResponse } from './../responses/create.contact.response';
// import { ContactSaveService } from './../contact.save.service';
import { Contact } from './../entities/contact.entity';
import { Injectable, Inject } from '@nestjs/common';
// import { ContactAggregate } from '../types/contact.aggregate';
import { ContactAggregateService } from './contact.aggregate.service';
import { ContactAggregate } from '../types/contact.aggregate';
import { CreateContactEvent } from '../../events/contact/commands';
import { CreateEntityResponse } from '../..//common/responses/command.response-Delete';
import { ContactCreatedEvent } from '../../events/contact/domainChanges';
import { CustomNatsClient } from 'src/custom.nats.client.service';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity';
import { DomainChangeEventFactory } from './domain.change.event.factory';
import { DomainChangeEventManager } from '../../outbox/domainchange.event.manager';
import { ConfigService }  from '@nestjs/config';
import { genBeforeAndAfterImage } from '../../utils/gen.beforeAfter.image';
import { DataChanges } from '../../common/responses/base.response';
import { UpdateContactEvent } from '../../events/contact/commands';
import { logStart, logStop } from 'src/utils/trace.log';
import { BaseError, ClientError } from '../../common/errors';
import { ServerError, ServerErrorReasons, ClientErrorReasons } from '../../common/errors/';
import { BaseResponse } from '../../common/responses/base.response';
import { CreateContactSaga } from '../sagas/create.contact.saga';
import { UpdateContactSaga } from '../sagas';
import { ContactQueryService } from '../dbqueries/services';
const logTrace = true;

@Injectable()
export class ContactServiceLatest {
  
  private generatedEvents: Array<ContactCreatedEvent> = [];

  private domainChangeEventsEnabled: boolean = false;

  constructor(
    private createContactSaga: CreateContactSaga,
    private updateContactSaga: UpdateContactSaga,
    private contactAggregateService: ContactAggregateService,
    private customNatsClient: CustomNatsClient,
    private configService: ConfigService,
    private outboxService: OutboxService,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager, 
    private contactQueryService: ContactQueryService,
    // private contactSaveService: ContactSaveService,
    // @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {
    /* set domainChangeEventsEnabled flag */
    if (this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS') === "true") {
      this.domainChangeEventsEnabled = true ;
    }
  }
  
  // async updateAggregate(updateContactEvent: UpdateContactEvent): Promise<UpdateContactResponse | BaseError> {
  //   const methodName = 'updateAggregate';
  //   logTrace && logStart([methodName, 'payload'], arguments);
    
  //   const { header, message } = updateContactEvent;
    
  //   // Destructure message to extract keys (for fetching aggregate) and update properties (for applying changes) .
  //   const { id, accountId, ...updateProperties }  = message; 
  //   let updateRequest = { ...updateProperties }; /* ONLY INCLUDE updateProperties in updateRequest */

  //   /* fetch aggregate entities */
  //   const aggregateEntities: ContactAggregateEntities = await this.contactAggregate.getAggregateEntitiesBy(accountId, id);

  //   /* if not found return 404 */
  //   if (!aggregateEntities.contact) {
  //     let clientError = new ClientError(404);
  //     clientError.setReason(ClientErrorReasons.KeysNotInDatabase);
  //     clientError.setLongMessage(`id: ${id}`)
  
  //     return clientError;
  //   }

  //   /* generate before and after image  */
  //   const beforeAndAfterImage: DataChanges = this.contactAggregate.generateBeforeAndAfterImages(updateRequest, aggregateEntities);
  //   /* apply updates to aggregate entities */

  //   let updatedAggregateEntities: ContactAggregateEntities;
  //   updatedAggregateEntities = this.contactAggregate.applyUpdates(updateRequest, aggregateEntities)
       
  //   /* handle requirement for publishing domain updated event  */
  //   this.prepareDomainUpdatedEvent(updateContactEvent, updatedAggregateEntities);
    
  //   // save changes
  //   let savedAggregateEntities: ContactAggregateEntities;
  //   savedAggregateEntities = await this.contactSaveService.save(updatedAggregateEntities);

  //   /* if save was NOT successful, return error response */
  //   if (!savedAggregateEntities.contact) {
  //     let serverError = new ServerError(500);
  //     serverError.setMessage(ServerErrorReasons.databaseError)
  //     serverError.setReason(`${methodName}: failed to update contact aggregate id:${id} `);
  //     return serverError;
  //   }
    
  //   // create response object
  //   const { id: contactId } = savedAggregateEntities.contact;
  //   const dataChanges: DataChanges =  beforeAndAfterImage;
  //   const updateContactResponse: UpdateContactResponse = new UpdateContactResponse(contactId);
  //   updateContactResponse.setUpdateImages(beforeAndAfterImage);
   
  //   logTrace && logStop(methodName, "updateContactResponse", updateContactResponse);
  //   return updateContactResponse;
  // }

  // TO BE DETERMINED NEED TO DECIDE IF THIS IS NEEDED
  // IF I ENABLE THIS AGAIN, COPY EXCEPTOIN HANDLING FROM upgradeAggregate(payload)
  // async updateAggregateById(id: number, updateRequest): Promise<ContactUpdatedResponse | ServerError> {
  //   console.log("[A]")
  //   /* fetch aggregate entities */
  //   const aggregateEntities: ContactAggregateEntities = await this.getAggregateEntitiesById(id);
  //   console.log("[B]")
  //   /* apply updates to aggregate entities */
  //   let updatedAggregateEntities: ContactAggregateEntities;
  //   updatedAggregateEntities = this.contactAggregate.applyUpdates(updateRequest, aggregateEntities)
  //   console.log("updatedAggregateEntities")
  //   console.log(updatedAggregateEntities);
  //   console.log("[C]")
  //   /* generate before and after image  */
  //   const beforeAndAfterImage: DataChanges = this.contactAggregate.generateBeforeAndAfterImages(updateRequest, updatedAggregateEntities);
  //   console.log("beforeAndAfterImage");
  //   console.log(beforeAndAfterImage);
    
  //   console.log("[D]")

  //   /* handle requirement for publishing Created event  */
  //   // this.prepareDomainUpdatedEvent(updateContactEvent, aggregate);
    
  //   // save changes
  //   let savedAggregateEntities: ContactAggregateEntities;
  //   savedAggregateEntities = await this.contactSaveService.save(updatedAggregateEntities);
  //   console.log("[E]")

  //   /* if save was NOT successful, return error response */
  //   if (!savedAggregateEntities.contact) {
  //     return new ServerError(500);
  //   }
  //   console.log("[F]")
  //   // create response object
  //   const { id: contactId } = savedAggregateEntities.contact;
  //   const dataChanges: DataChanges =  beforeAndAfterImage;
  //   const contactUpdatedResponse: ContactUpdatedResponse = new ContactUpdatedResponse(contactId);
  //   contactUpdatedResponse.setUpdateImages(beforeAndAfterImage);
  //   console.log("contactUpdatedResponse")
  //   console.log(contactUpdatedResponse)

  //   console.log("[G]")
  //   return contactUpdatedResponse;
  // }
 
  // To Be DELETED
  // async getAggregateEntitiesById(id: number): Promise<ContactAggregateEntities> {
  //   return await this.contactAggregate.getAggregateEntitiesById(id);
  // }
 
  // service used to create aggregate using create.contact.saga.
  //
  /**
   * Create aggregate using create.contact.saga and convert return value to hypermedia response.
   * If error create contact, return server error.
   * @param createContactEvent 
   * @returns createContactResponse | ServerError
   */ 
  async createContact(createContactEvent: CreateContactEvent):  Promise<CreateContactResponse | BaseError> {
    const methodName = 'createContact';
    logTrace && logStart([methodName, 'createContactEvent',createContactEvent ], arguments);

    const { header, message } = createContactEvent;

    /* Check if contact exists, if so, return 409 conflict(duplicate) error  */
    const { accountId, email } = message;
    const contactExists = await this.contactQueryService.checkContactExistsByEmail(accountId, email);
    if (contactExists) {
      return this.duplicateContactError(email);
    }

    /* Run the create contact saga */
    const aggregate: ContactAggregate = await this.createContactSaga.execute(createContactEvent);
        
    /* if save was NOT successful, return error response */
    if (!aggregate.contact) { 
      const serverError: ServerError =  this.createAggregateError(message.email);  
      logTrace && logStop(methodName, 'serverError', serverError);
      return serverError;
    }

    /* if successful (contact exists in aggregate), construct hypermdedia like response */
    const { contact } = aggregate;
    let createContactResponse: CreateContactResponse = new CreateContactResponse(contact.id);

    logTrace && logStop(methodName, 'createContactResponse', createContactResponse);
    return createContactResponse;
  }

  /**
   * Update contact aggregate using UpdateContactSaga
   * @param updateContactEvent 
   */
  async updateContact(updateContactEvent: UpdateContactEvent): Promise<any> {
    // const methodName = 'updateContact';
    // logTrace && logStart([methodName, 'updateContactEvent',updateContactEvent ], arguments);

    const { header, message } = updateContactEvent; 
    const { id, accountId, ...updateProperties }  = message; 

    /* If contact does not exists, return 404 error */
    const contactExists = await this.contactQueryService.checkContactExistsById(accountId, id);
    console.log("contactExists var ", contactExists)
    if (!contactExists) {
      return this.notFoundContactError(id)
    }

    /* Execute update contact saga */
    const result: any = await this.updateContactSaga.execute(updateContactEvent)

    // logTrace && logStop(methodName, 'createContactResponse', createContactResponse);
    return result;
  }

  /**
   * Prepares the event and the outbox instance to publish a domain created event.
   * Note that the domainChangeEventsEnabled flag must be set to publish events.
   * @param createContactEvent 
   * @param aggregate 
   */
  // async prepareDomainCreatedEvent(
  //   createContactEvent: CreateContactEvent, 
  //   aggregate: ContactAggregate)
  // {
  //   const methodName = 'prepareDomainCreatedEvent';
  //   logTrace && logStart([methodName, 'createContactEvent','aggregate'], arguments);
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
  //   let contactOutboxInstance: ContactOutbox = await this.outboxService.createContactCreatedInstance(
  //         createContactEvent, 
  //         serializedContactCreatedEvent
  //       );

  //   logTrace && logStop(methodName, 'contactOutboxInstance',contactOutboxInstance);
  //   /* append instance to the aggregate  */
  //   // aggregate.contactOutbox = contactOutboxInstance;
  // }

  /**
   * Prepares the event and the outbox instance to publish a domain updated event.
   * Note that the domainChangeEventsEnabled flag must be set to publish events.
   * @param createContactEvent 
   * @param aggregate 
   */
  async prepareDomainUpdatedEvent(
    updateContactEvent: UpdateContactEvent, 
    aggregate: ContactAggregate) 
  {
    const methodName = 'prepareDomainUpdatedEvent';
    logTrace && logStart([methodName, 'updateContactEvent','aggregate'], arguments);
    /* If flag is disabled to publish domain updated events, return */
    if (!this.domainChangeEventsEnabled) {  
      return;  
    } 

    /* extract version from aggregate to pass down to include in updatedConsumerEvent */
    const contact = aggregate.contact;
    const version: number = contact.version;

    /* create serialized contactCreatedEvent */
    const serializedContactUpdatedEvent = this.domainChangeEventFactory.genUpdatedEventFor(updateContactEvent, version);

    /* create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance: ContactOutbox = await this.outboxService.generateContactUpdatedInstance(
          updateContactEvent, 
          serializedContactUpdatedEvent
        );
    /* append instance to the aggregate  */
    logTrace && logStop(methodName, 'contactOutboxInstance',contactOutboxInstance);
    // aggregate.contactOutbox = contactOutboxInstance;
  }

  // *****************************************************************
  // Helper methods
  // *****************************************************************

  // async getNextOutboxSequence() {
  //    // get query that joins the 3 tables
  //    let sqlStatement = "SELECT NEXTVAL('contact_id_seq')";
  //    const sqlResult = await this.dataSource.query(sqlStatement);
  //    const nextSeqNum = sqlResult[0].nextval;
  //    return nextSeqNum;
  // }

  createAggregateError(email) {
    let createError = new ServerError(500);
    createError.setMessage(ServerErrorReasons.databaseError);
    createError.setReason(`failed to create contact with email:${email} `);
    return createError;
  }

  duplicateContactError(email) {
    const duplicateError = new ClientError(409); /* this sets generic message */
    duplicateError.setReason(ClientErrorReasons.DuplicateEntry);
    duplicateError.setLongMessage(`contact with email '${email}' already exists`);
    return duplicateError;
  }

  notFoundContactError(id) {
    const duplicateError = new ClientError(404); /* this sets generic message */
    // duplicateError.setReason(ClientErrorReasons.KeysNotInDatabase);
    duplicateError.setLongMessage(`contact id '${id}'`);
    return duplicateError;
  }
}
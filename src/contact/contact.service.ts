import { ContactUpdatedResponse } from './responses/contact.updated.response';
import { ConfigModule } from '@nestjs/config';
import { OutboxService } from './../outbox/outbox.service';
import { CreateContactResponse } from './../common/responses/command.response';
import { ContactSaveService } from './contact.save.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
import { CreateContactEvent } from 'src/events/contact/commands';
import { CreateEntityResponse } from 'src/common/responses/command.response';
import { ServerError } from '../common/errors/server.error';
import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
import { ContactCreatedEvent } from '../events/contact/domainChanges';
import { CustomNatsClient } from 'src/custom.nats.client.service';
import { ContactOutbox } from '../outbox/entities/contact.outbox.entity';
import { DomainChangeEventFactory } from './domain.change.event.factory';
import { DomainChangeEventManager } from 'src/outbox/domainchange.event.manager';
import { ConfigService }  from '@nestjs/config';
import { genBeforeAndAfterImage } from '../utils/gen.beforeAfter.image';
import { DataChanges } from '../common/responses/base.response'

@Injectable()
export class ContactService {
  
  private generatedEvents: Array<ContactCreatedEvent> = [];

  private domainChangeEventsEnabled: boolean = false;

  constructor(
    private contactAggregate: ContactAggregate,
    private customNatsClient: CustomNatsClient,
    private configService: ConfigService,
    private outboxService: OutboxService,
    private domainChangeEventFactory: DomainChangeEventFactory,
    private domainChangeEventManager: DomainChangeEventManager, 
    private contactSaveService: ContactSaveService
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {
    /* set domainChangeEventsEnabled flag */
    if (this.configService.get('PUBLISH_DOMAIN_CHANGE_EVENTS') === "true") {
      this.domainChangeEventsEnabled = true ;
    }
  }
  
  async updateAggregateById(id: number, updateRequest): Promise<ContactUpdatedResponse | ServerError> {
    
    console.log("[A]")
    /* fetch aggregate entities */
    const aggregateEntities: ContactAggregateEntities = await this.getAggregateEntitiesById(id);
    console.log("[B]")
    /* apply updates to aggregate entities */
    let updatedAggregateEntities: ContactAggregateEntities;
    updatedAggregateEntities = this.contactAggregate.applyUpdates(updateRequest, aggregateEntities)
    console.log("updatedAggregateEntities")
    console.log(updatedAggregateEntities);
    console.log("[C]")
    /* generate before and after image  */
    const beforeAndAfterImage: DataChanges = this.contactAggregate.generateBeforeAndAfterImages(updateRequest, updatedAggregateEntities);
    console.log("beforeAndAfterImage");
    console.log(beforeAndAfterImage);
    
    console.log("[D]")

    /* handle requirement for publishing Created event  */
    // this.prepareDomainUpdatedEvent(updateContactEvent, aggregate);
    
    // save changes
    let savedAggregateEntities: ContactAggregateEntities;
    savedAggregateEntities = await this.contactSaveService.save(updatedAggregateEntities);
    console.log("[E]")

    /* if save was NOT successful, return error response */
    if (!savedAggregateEntities.contact) {
      return new ServerError(500);
    }
    console.log("[F]")
    // create response object
    const { id: contactId } = savedAggregateEntities.contact;
    const dataChanges: DataChanges =  beforeAndAfterImage;
    const contactUpdatedResponse: ContactUpdatedResponse = new ContactUpdatedResponse(contactId);
    contactUpdatedResponse.setUpdateImages(beforeAndAfterImage);
    console.log("contactUpdatedResponse")
    console.log(contactUpdatedResponse)

    console.log("[G]")
    return contactUpdatedResponse;
  }
 

  async getAggregateEntitiesById(id: number): Promise<ContactAggregateEntities> {
    return await this.contactAggregate.getAggregateEntitiesById(id);
  }

  // service used to create aggreate, then save it.
  async create(createContactEvent: CreateContactEvent):  Promise<CreateEntityResponse | ServerError> {
    console.log(">>>> Inside contactService.create method");
    console.log(`    var createContactEvent: ${JSON.stringify(createContactEvent)}`);

    const { sessionId, userId } = createContactEvent.header;
    const { accountId, email, firstName, lastName } = createContactEvent.message;

    /* create the aggregate */
    const aggregate: ContactAggregateEntities = await this.contactAggregate.create(createContactEvent);
    console.log("This is returned contact aggregate ", aggregate);

    /* handle requirement for publishing Created event  */
    this.prepareDomainCreatedEvent(createContactEvent, aggregate);

    /* Save the aggregate members, the generated event(s) to outbox, and return aggregate root */
    let aggregateEntities: ContactAggregateEntities = await this.contactAggregate.idempotentCreate(aggregate, this.generatedEvents);

    /* if save was NOT successful, return error response */
    if (!aggregateEntities.contact) {
      return new ServerError(500);
    }
    
    /* Sends command to outbox to publish unpublished events in outbox for a given account */
    const cmdResult: any = await this.domainChangeEventManager.triggerOutboxForAccount(accountId)

    /* create response object using aggregateRoot.id */
    const { contact } = aggregateEntities;
    let createEntityResponse: CreateContactResponse = new CreateContactResponse(contact.id);

    return createEntityResponse;
  }

  /**
   * Prepares the event and the outbox instance to publish a domain created event.
   * Note that the domainChangeEventsEnabled flag must be set to publish events.
   * @param createContactEvent 
   * @param aggregate 
   */
  async prepareDomainCreatedEvent(
      createContactEvent: CreateContactEvent, 
      aggregate: ContactAggregateEntities) 
  {
    /* If flag is disabled to publish domain change events, return */
    if (!this.domainChangeEventsEnabled) {  
      return;  
    } 

    /* create serialized contactCreatedEvent */
    const serializedContactCreatedEvent = this.domainChangeEventFactory.getCreatedEventFor(createContactEvent);
  
    /* create Outbox Instance of contactCreatedEvent, from createContactEvent */
    let contactOutboxInstance: ContactOutbox = await this.outboxService.generateContactCreatedInstances(
          createContactEvent, 
          serializedContactCreatedEvent
        );
    /* append instance to the aggregate  */
    aggregate.contactOutbox = contactOutboxInstance;
  }

  // *****************************************************************
  // Helper methods
  // *****************************************************************

}
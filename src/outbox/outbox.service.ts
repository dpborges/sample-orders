import { UpdateEventStatusCmdPayload } from './events/commands/update.status.payload';
import { UpdateOutboxStatusCmdPayload } from './../../dist/src/outbox/events/commands/outbox.process_unpublished.payload copy.d';
import { ContactCreatedEvent } from '../events/contact/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { CreateContactEvent } from '../events/contact/commands/create-contact-event';
import { ServerError } from '../common/errors/server.error';
import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
import { PublishUnpublishedEventsCmdPayload } from './events/commands';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactOutbox } from './entities/contact.outbox.entity';
import { OutboxStatus } from './outbox.status.enum';
import { Subjects } from '../events/contact/domainChanges';
import { DomainChangeEventPublisher } from './domainchange.event.publisher';
import { SubjectAndPayload } from './types/subject.and.payload';

@Injectable()
export class OutboxService {
  
  constructor(
    // private contactAggregate: ContactAggregate,
    // private customNatsClient: CustomNatsClient
    private domainChangeEventPublisher: DomainChangeEventPublisher,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  

  /**
   * Retrieves list of unpublished events for a given accountId from the outbox and creates an array
   * of { subject, payload } instances, and passes array to publishEvents method of
   * domainChangeEventPublisher
   * Payload carries the accountId and method returns an array of unpublished events.
   * @param payload 
   * @returns unpublishedEvents
   */
  async publishUnpublishedEvents(payload: PublishUnpublishedEventsCmdPayload): Promise<any[]> {
    console.log(">>>> Inside publishUnpublishedEvents method");

    /* find unpublished events in outbox for a  given accountId */
    const outboxInstances: Array<ContactOutbox> = 
      await this.contactOutboxRepository.find({
        where: { accountId: payload.accountId }
      });
    console.log(" =============================")
    console.log(" instances stored in outbox ", outboxInstances)
    console.log(" =============================")
    /* init unpublished events array */
    let unpublishedEvents: Array<SubjectAndPayload> = [];

    /* construct subject and payload object and save in array of unpublished events */
    outboxInstances.forEach((outboxInstance) => {
        /* pull out subject and payload from outbox instance */
        let subject = outboxInstance.subject;
        let payload: ContactCreatedEvent = JSON.parse(outboxInstance.payload);

        /* add the outbox instance Id (outboxId) to the header */
        let {  header, message } = payload;
        header.outboxId = outboxInstance.id;
        payload = { header: {...header}, message: {...message} }

        /* construct a  subject/payload pair to same in the outbox */
        let subjectAndPayload: SubjectAndPayload = { subject, payload }
        
        unpublishedEvents = unpublishedEvents.concat(subjectAndPayload)
    })

    console.log("    Unpublished events array ", unpublishedEvents)
    await this.domainChangeEventPublisher.publishEvents(unpublishedEvents)

    return unpublishedEvents;
  }

  /* generates the contactCreatedEvent and returns an outbox entity instance
     to the contact service to ultimately save it with the aggregate save transaction   */
  generateContactCreatedInstances(createContactEvent: CreateContactEvent): ContactOutbox {
    console.log(">>> Inside OutboxService.generateDomainCreatedInstances ")
    // console.log("    contactCreatedEvent ",  createContactEvent);
    const { userId }    = createContactEvent.header;
    const { accountId } = createContactEvent.message;

    const serializedContactCreatedEvent = this.generateContactCreatedEvent(createContactEvent);

    const contactCreatedEventOutboxInstance:ContactOutbox = this.contactOutboxRepository.create({
      accountId, 
      subject: Subjects.ContactCreated,
      payload: serializedContactCreatedEvent,
      userId,
      status: OutboxStatus.unpublished
   });
      
   return contactCreatedEventOutboxInstance
  }

  /* helper function (used by generateContactCreatedInstances) to create and 
     serialize contactCreatedEvent  */
  generateContactCreatedEvent(createContactEvent): string {
    /* destructure properties for create contact event */
    const  { accountId, email, firstName, lastName } = createContactEvent.message;
    const  { sessionId, userId } = createContactEvent.header;

    /* use destructured properties to define what to include in contactCreatedEvent  */
    const contactCreatedEvent: ContactCreatedEvent = { 
      header:  { sessionId, userId },
      message: { accountId, email, firstName, lastName  }
    }
    /* serialize event  */
    const serializedContactCreatedEvent: string = JSON.stringify(contactCreatedEvent);

    return serializedContactCreatedEvent;
  }


}
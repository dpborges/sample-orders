import { ContactCreatedEvent } from '../events/contact/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { CreateContactEvent } from '../events/contact/commands/create-contact-event';
import { ServerError } from '../common/errors/server.error';
import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
import { PublishUnpublishedEventsCmdPayload } from '../events/outbox/commands';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactOutbox } from './entities/contact.outbox.entity';
import { OutboxStatus } from './outbox.status.enum';
import { Subjects } from '../events/contact/domainChanges';
import { DomainEventPublisher } from './domain.event.publisher';
import { SubjectAndPayload } from './types/subject.and.payload';

@Injectable()
export class OutboxService {
  
  // private generatedEvents: Array<ContactCreatedEvent> = [];

  /* Create Dto */
  // private createContactDto: CreateContactDto;

  constructor(
    // private contactAggregate: ContactAggregate,
    // private customNatsClient: CustomNatsClient
    private domainEventPublisher: DomainEventPublisher,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  
  // async getAggregate<T>(id: number){
  //   return this.contactAggregate.findById(id);
  // }

  // publish unpublished events in outbox for a given account
  async publishUnpublishedEvents(payload: PublishUnpublishedEventsCmdPayload): Promise<any[]> {
    console.log(">>>> Inside publishUnpublishedEvents method");

    /* find unpublished events in outbox fora  given accountId */
    const outboxInstances: Array<ContactOutbox> = 
      await this.contactOutboxRepository.find({
        where: { accountId: payload.accountId }
      });
    
    /* init unpublished events array */
    let unpublishedEvents: Array<SubjectAndPayload> = [];

    /* constructed subject and payload object and save in array of unpublished events */
    outboxInstances.forEach((outboxInstance) => {
      let subject = outboxInstance.subject;
      let payload: ContactCreatedEvent = JSON.parse(outboxInstance.payload)
      let subjectAndPayload: SubjectAndPayload = { subject, payload }
      
      unpublishedEvents = unpublishedEvents.concat(subjectAndPayload)
    })
    this.domainEventPublisher.publishEvents(unpublishedEvents)
    console.log("    Unpublished events array ", unpublishedEvents)
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
    const  { accountId, email, firstName, lastName } = createContactEvent.message;

    /* define created event here  */
    const contactCreatedEvent: ContactCreatedEvent = { 
      accountId, email, firstName, lastName 
    }
    /* serialize event  */
    const serializedContactCreatedEvent: string = JSON.stringify(contactCreatedEvent);

    return serializedContactCreatedEvent;
  }

}
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

    const outboxInstances: Array<ContactOutbox> = 
      await this.contactOutboxRepository.find({
        where: { accountId: payload.accountId }
      });
    
    let unpublishedEvents: Array<SubjectAndPayload> = [];

    outboxInstances.forEach((outboxInstance) => {

      let subjectAndPayload: SubjectAndPayload = {
        subject: outboxInstance.event,
        payload: JSON.parse(outboxInstance.payload)
      }
      // console.log("    Unpublished event subject ", subject)
      // console.log("    Unpublished event payload ", payload)
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
      event: Subjects.ContactCreated,
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
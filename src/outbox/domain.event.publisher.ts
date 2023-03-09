import { ContactCreatedEvent } from '../events/contact/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { CreateContactEvent } from '../events/contact/commands/create-contact-event';
import { ServerError } from '../common/errors/server.error';
import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
// import { PublishUnpublishedEventsCmdPayload } from '../events/outbox/commands';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactOutbox } from './entities/contact.outbox.entity';
import { OutboxStatus } from './outbox.status.enum';
import { Subjects } from '../events/contact/domainChanges';
import { SubjectAndPayload } from './types/subject.and.payload';
import { CustomNatsClient } from '../custom.nats.client.service';

@Injectable()
export class DomainEventPublisher {
  
  constructor(
    private customNatsClient: CustomNatsClient,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  
  // publish unpublished events and change status flag to 'published' in outbox
  async publishEvents<ContactCreatedEvent>(eventInstances: Array<SubjectAndPayload>): Promise<any> {
    console.log(">>>> Inside publishEvents method");

    eventInstances.forEach(async (eventInstance) => {
      console.log("    eventInstance ", eventInstance)
      let subject = eventInstance.event;
      let payload = eventInstance.payload;
      let publishResult = await this.customNatsClient.publishEvent(subject, payload);
      // console.log(`MS - Acknowledgement from publishing orderCreatedEvent: ${publishResult}`);
    })
  
    return 'unpublishedEvents';
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
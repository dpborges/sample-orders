import { EventStatusUpdater } from './event.status.updater';
import { UpdateEventStatusCmdPayload } from './events/commands/update.status.payload';
import { OutboxService } from './outbox.service';
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
    // private outboxService: OutboxService,
    private customNatsClient: CustomNatsClient,
    private eventStatusUpdater: EventStatusUpdater,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  
  // publish unpublished events and change status flag to 'published' in outbox
  async publishEvents<ContactCreatedEvent>(eventInstances: Array<SubjectAndPayload>): Promise<any> {
    console.log(">>>> Inside publishEvents method");

    eventInstances.forEach(async (eventInstance) => {
      console.log("    eventInstance ", eventInstance)
      let subject = eventInstance.subject;
      let payload = eventInstance.payload;
      
      /* publish event */
      let publishResult = await this.customNatsClient.publishEvent(subject, payload);

      console.log(`MS -publishing orderCreatedEvent: ${publishResult}`);

      /* update event status to published */
      if (this.isAcknowledged(publishResult)) {
        const { outboxId } = payload.header;
        const status = OutboxStatus.published;
        const cmdPayload: UpdateEventStatusCmdPayload = { outboxId,  status }
        await this.eventStatusUpdater.updateStatus(cmdPayload)
      }
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
    /* destructure properties from createDomainEvent to selectively add to DomainCreatedEvent */
    const { sessionId, userId } = createContactEvent.header;
    const { accountId, email, firstName, lastName } = createContactEvent.message;

    /* use properties from createDomain event to define domainCreatedEvent   */
    const contactCreatedEvent: ContactCreatedEvent = { 
      header:  {sessionId, userId },
      message: { accountId, email, firstName, lastName }
    }
    /* serialize event  */
    const serializedContactCreatedEvent: string = JSON.stringify(contactCreatedEvent);

    return serializedContactCreatedEvent;
  }

  // *********************************************************
  // Helpers
  // *********************************************************
  
  /* Checks that the string 'acknowledged' is in the result */
  isAcknowledged(publishResult): boolean {
    let acknowledged = true;
    if (!JSON.stringify(publishResult).includes('acknowledged')) {
      acknowledged = false;
    }
    return acknowledged;
  }

}
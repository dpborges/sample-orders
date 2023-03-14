import { Injectable } from '@nestjs/common';
import { CreateContactEvent } from 'src/events/contact/commands';
import { ContactOutbox } from 'src/outbox/entities/contact.outbox.entity';
import { ContactCreatedEvent } from 'src/events/contact/domainChanges';
import { Subjects } from 'src/events/contact/domainChanges';
// import { AggregrateService } from './aggregrate/aggregrate.service';

/**
 * Generates DomainChange Events such as CreatedEntity, UpdatedEntity, DeletedEntity
 */
@Injectable()
export class DomainChangeEventFactory {
  
  constructor(
    // private aggregateService: AggregrateService
    // private client: NatsJetStreamClient,
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}
  
  /**
     * Returns a serialzied CreatedEvent payload 
     * @param createContactEvent 
     */
  getCreatedEventFor(createContactEvent): string {
    
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


 /* generates the contactCreatedEvent and returns an outbox entity instance
     to the contact service to ultimately save it with the aggregate save transaction   */
    //  generateContactCreatedInstances(createContactEvent: CreateContactEvent): ContactCreatedEvent {
    //   console.log(">>> Inside OutboxService.generateDomainCreatedInstances ")
    //   // console.log("    contactCreatedEvent ",  createContactEvent);
    //   const { userId }    = createContactEvent.header;
    //   const { accountId } = createContactEvent.message;
  
    //   const serializedContactCreatedEvent = this.generateContactCreatedEvent(createContactEvent);
  
    //   const contactCreatedEvent = this.contactOutboxRepository.create({
    //     accountId, 
    //     subject: Subjects.ContactCreated,
    //     payload: serializedContactCreatedEvent,
    //     userId,
    //     status: OutboxStatus.unpublished
    //  });
        
    //  return contactCreatedEvent;
    // }

  
     
    



}

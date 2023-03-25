import { UpdateContactEvent } from '../../events/contact/commands';
import { Injectable } from '@nestjs/common';
import { CreateContactEvent } from 'src/events/contact/commands';
import { ContactOutbox } from 'src/outbox/entities/contact.outbox.entity';
import { ContactCreatedEvent, ContactUpdatedEvent } from '../../events/contact/domainChanges';
import { logStart, logStop } from 'src/utils/trace.log';
import { Subjects } from 'src/events/contact/domainChanges';
// import { AggregrateService } from './aggregrate/aggregrate.service';

const logTrace = true;

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
     * Generate a serialzied CreatedDomainEvent payload from CreateDomainEvent
     * @param createContactEvent 
     */
  genCreatedEventFor(createContactEvent, version: number): string {
    const methodName = 'genCreatedEventFor'
    logTrace && logStart([methodName, 'createContactEvent', 'version'], arguments);

    /* destructure properties for create contact event */
    const  { accountId,  email, firstName, lastName } = createContactEvent.message;
    const  { sessionId, userId } = createContactEvent.header;

    /* default to version 1 when creating new aggregate */
    version =  1;

    /* use destructured properties to define what to include in contactCreatedEvent  */
    const contactCreatedEvent: ContactCreatedEvent = { 
      header:  { sessionId, userId },
      message: { accountId, version, email, firstName, lastName  }
    }
    /* serialize event  */
    const serializedContactCreatedEvent: string = JSON.stringify(contactCreatedEvent);

    logTrace && logStop(methodName, 'serializedContactCreatedEvent', serializedContactCreatedEvent)
    return serializedContactCreatedEvent;
  }


  /**
   * Generate a serialzied updatedDomainEvent payload  from updateDomainEvent
   * @param createContactEvent 
   * @param version
   */
  genUpdatedEventFor(updateContactEvent: UpdateContactEvent, version: number): string {
    const methodName = 'genUpdatedEventFor'
    logTrace && logStart([methodName, 'updateContactEvent', 'version'], arguments);
    
    /* destructure properties for create contact event */
    const  { sessionId, userId } = updateContactEvent.header;
    const  { id, accountId, ...updateProperties } = updateContactEvent.message;

    /* increment version */
    version = version + 1;

    /* use destructured properties to define what to include in updatedEvent  */
    const contactUpdatedEvent: ContactUpdatedEvent = { 
      header:  { sessionId, userId },
      message: { id, accountId, version, ...updateProperties  }
    }
    /* serialize event  */
    const serializedContactUpdatedEvent: string = JSON.stringify(contactUpdatedEvent);

    logTrace && logStop(methodName, 'serializedContactUpdatedEvent', serializedContactUpdatedEvent)
    return serializedContactUpdatedEvent;
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

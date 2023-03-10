import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
import { Repository, DataSource } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { Contact } from './entities/contact.entity';
import { ContactSource } from './entities/contact.source.entity';
import { ContactAcctRel } from './entities/contact.acct.rel.entity';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
import { ContactCreatedEvent } from 'src/events/contact/domainChanges';
import { ContactOutbox } from '../outbox/entities/contact.outbox.entity';

// Class is relegated to handling save transaction involving one or more aggregate entities
// Persistent rules are handled in the domain aggregate class
@Injectable()
export class ContactSaveService {
  
  constructor(
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>
  ) {}
  
  async save(
      contactAggregateEntities: ContactAggregateEntities,
      generatedEvents: Array<ContactCreatedEvent>,
      // headerInfo: 
    ): Promise<Contact> {
    /* establish connection  */
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    /* destructure Aggregate Entities  */
    let { contact, contactSource, contactAcctRel, contactOutbox } = contactAggregateEntities;

    /* start transaction */
    await queryRunner.startTransaction();
    
    /* save aggregate  */
    try {
      if (contact) {
        /* save contact  */
        contact = await this.contactRepository.save(contactAggregateEntities.contact)
      } 
      if (contactSource) {
        /* assign contact id to contactSource to establish 1:1 relationship */
        contactSource.contactId = contact.id;
        /* save contactSource */
        const savedContactSource: ContactSource = await this.contactSourceRepository.save(contactAggregateEntities.contactSource)
      }
      if (!contactAcctRel) {
        console.log("NO CONTACT ACCT RELATION")
      } 
      /* save generated events to outbox */
      if (contactOutbox) {
        contactOutbox = await this.contactOutboxRepository.save(contactAggregateEntities.contactOutbox)
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      // rollback changes 
      await queryRunner.rollbackTransaction();
      // nullify aggregate root object
      contact = null;
    } finally {
      // release query runner which is manually created:
      await queryRunner.release();
    }

    return contact;
  };

  

  async saveEventToOutbox(contactCreatedEvent: ContactCreatedEvent) {

  }
  

  // **************************************************************
  // Helpers
  // **************************************************************
  // allAggregateEntitiesNull(contactAggregateEntities) {
  //   /* define predicate function */
  //   const isNull = value => value === null;

  //   /* transfer entity values into array */
  //   let entityArrayValues = [];
  //   Object.keys(contactAggregateEntities).forEach((key:string) => entityArrayValues.push(contactAggregateEntities[key]) );

  //   /* return if all values are null or not */
  //   return entityArrayValues.every(isNull)
  // }
  

}
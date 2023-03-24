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
import { logStart, logStop } from 'src/utils/trace.log';

const logTrace = true;

// Class is responsible for saving aggregate entities as a one transaction.
// If an outbox is include in the within the AggregateEntities object, it will included in transaction.
// Persistent rules are handled in the domain aggregate class
@Injectable()
export class ContactInsertService {
  
  constructor(
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_ACCT_REL_REPOSITORY) private contactAcctRelRepository: Repository<ContactAcctRel>,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>
  ) {}
  
  async insert(
      contactAggregateEntities: ContactAggregateEntities
      // headerInfo: 
    ): Promise<ContactAggregateEntities> {
    const methodName = 'insert';
    logTrace && logStart([methodName, 'contactAggregateEntities'], arguments)

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
        // contactAggregateEntities.contact = await this.contactRepository.insert(contactAggregateEntities.contact)
        let contactResult: any  = await this.contactRepository.insert(contactAggregateEntities.contact)
        contactAggregateEntities.contact = contactResult;
      } 
      if (contactSource) {
        /* assign contact id to contactSource to establish 1:1 relationship */
        contactSource.contactId = contact.id;
        /* save contactSource */
        let contactSourceResult: any = await this.contactSourceRepository.insert(contactAggregateEntities.contactSource);
        contactAggregateEntities.contactSource = contactSourceResult;
      }
      if (contactAcctRel) {
        /* create contact -> account relationship, where one contact may exist in multiple accounts */
        contactAcctRel.contactId = contact.id;
        let contactAcctRelResult: any = await this.contactAcctRelRepository.insert(contactAggregateEntities.contactAcctRel);
        contactAggregateEntities.contactAcctRel = contactAcctRelResult;
      } 
      /* save generated events to outbox */
      if (contactOutbox) {
        let contactOutboxResult: any = await this.contactOutboxRepository.insert(contactAggregateEntities.contactOutbox);
        contactOutbox = contactOutboxResult;
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      // rollback changes 
      await queryRunner.rollbackTransaction();
      // nullify aggregate root object
      contactAggregateEntities.contact = null;
    } finally {
      // release query runner which is manually created:
      await queryRunner.release();
    }
    logTrace && logStop(methodName, 'contactAggregateEntities', contactAggregateEntities)
    return contactAggregateEntities;
  };


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
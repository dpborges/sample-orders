import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
import { Repository, DataSource } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { Contact } from './entities/contact.entity';
import { ContactSource } from './entities/contact.source.entity';
import { ContactAcctRel } from './entities/contact.acct.rel.entity';
import { RepoToken } from './repos/repo.token.enum';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';

@Injectable()
export class ContactSaveService {
  
  constructor(
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>
  ) {}
  
  async save(contactAggregateEntities: ContactAggregateEntities) {
    /* establish connection  */
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    /* destructure Aggregate Entities  */
    let { contact, contactSource, contactAcctRel } = contactAggregateEntities;

    /* initialize transaction status */
    let transactionStatus = { successful: true, errorMessage: ''}

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
      await queryRunner.commitTransaction()
    } catch (err) {
      // rollback changes and set success flag to false
      await queryRunner.rollbackTransaction();
      transactionStatus.successful = false;
      transactionStatus.errorMessage = `ERROR: ${err}`
    } finally {
      // release query runner which is manually created:
      await queryRunner.release();
    }

    /* save contact  */
    // const savedContact: Contact = await this.contactRepository.save(contactAggregateEntities.contact)

    /* assign contact id to contactSource */
    // contactAggregateEntities.contactSource.contactId = savedContact.id;
    /* save contactSource */
    // const savedContactSource: ContactSource = await this.contactSourceRepository.save(contactAggregateEntities.contactSource)
    return contactAggregateEntities;
  };
  
  
}
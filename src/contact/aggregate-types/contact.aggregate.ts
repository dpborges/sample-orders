import { contactRepositories } from './../repos/contact.repositories';
import { ContactAcctRel } from './../entities/contact.acct.rel.entity';
import { ContactSource } from './../entities/contact.source.entity';
import { ContactSaveService } from './../contact.save.service';
import { Injectable, Inject } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Contact } from './../entities/contact.entity';
import { AggregateRoot } from 'src/aggregrate/aggregateRoot';
import { CreateContactDto } from '../dtos/create.contact.dto';
import { RepoToken } from '../repos/repo.token.enum';
import { ContactAggregateEntities } from './contact.aggregate.type';
import { BusinessRule } from './business-rule.enum';
import { TransactionStatus } from './transaction-status.type'
import { CreateContactEvent } from 'src/events/contacts/create-contact-event';

// class used to construct aggregate object with related entities from event payload/
// This class also has creational business rules and/or save business rules
@Injectable()
export class ContactAggregate extends AggregateRoot {

  constructor(
    private contactSaveService: ContactSaveService,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.DATA_SOURCE) private dataSource: DataSource
  ) {super()};

  aggregate: ContactAggregateEntities = {
     contact: null,
     contactSource: null,
     contactAcctRel: null
  }
 
  /* Constructs aggregate from parts from the create <domain> event object.  */
  async create(createContactEvent: CreateContactEvent): Promise<ContactAggregateEntities> {
    /* destructure Dto to extract aggregate entities */
    const { email, accountId, firstName, lastName, webSiteUrl, mobilePhone } = createContactEvent;
    const { sourceType: type, sourceName: name } = createContactEvent;
    
    /* create contact instance and set the aggregate property */
    this.aggregate.contact = this.contactRepository.create(createContactEvent);
    
    /* create contact source and set the aggregate property */
    this.aggregate.contactSource = this.contactSourceRepository.create({type, name});
    
    /* assign default version to new contact aggregate */
    this.aggregate.contact.version = this.getInitialVersion();  // append version from aggregate root

    /* Return aggregate entities instance so it can subsequently be used by save() operation */
    return this.aggregate;
  };

  /* returns entire aggregate  */
  async findById(id): Promise<any> {
    const contact = this.dataSource
      .getRepository(Contact)
      .createQueryBuilder("contact")
      .where("contact.id = :id", {id: 1})
      .getOne()
    return contact;
  };

  applyChanges() {};

  async save(contactAggregateEntities: ContactAggregateEntities): Promise<Contact> {
    console.log(">>>> Inside contactAggregate.save()")
    /* implements idempotent behavior by responding with existing contact */
    const { contact } = contactAggregateEntities;
    const ruleInputs = { accountId: contact.accountId, email: contact.email };
    const existingContact: Contact = await this.runAsyncBusinessRule(BusinessRule.contactExistCheck, ruleInputs);
    console.log(`    contactExist value: ${existingContact}`)
    if (existingContact) {  /* If exists, no need to call save. Just retrun existing aggregate root */
      return existingContact;
    } 
    /* returns the aggregate root */
    return await this.contactSaveService.save(contactAggregateEntities) 
  }
 
 async runAsyncBusinessRule(businessRule, ruleInputs) {
    let ruleResult: any = true;
    switch(businessRule) {
      case BusinessRule.contactExistCheck:
        ruleResult = await this.findContactByAcctandEmail(ruleInputs)
        break;
      case BusinessRule.updateContactXyzRule:
        /* bizlogic */
        break;
      default:
    }
    return ruleResult;
  }
  

  validate(){};


  //***************************************************************************** 
  // Helper functions and business rules
  //***************************************************************************** 
  
  async findContactByAcctandEmail(ruleInputs): Promise<Contact> {
    console.log(">>>> Inside findContactByAcctandEmail")
    const { accountId, email } = ruleInputs;
    const contact =  await this.contactRepository.findOne({
      where: { accountId, email }
    })
    console.log(`     contact: ${contact}`)
    return contact;
  }

}

  
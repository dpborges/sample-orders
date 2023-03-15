var camelize = require('camelize');
import { contactRepositories } from './../repos/contact.repositories';
import { ContactAcctRel } from './../entities/contact.acct.rel.entity';
import { ContactSource } from './../entities/contact.source.entity';
import { ContactSaveService } from './../contact.save.service';
import { Injectable, Inject } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Contact } from './../entities/contact.entity';
import { AggregateRoot } from 'src/aggregrate/aggregateRoot';
import { CreateContactDto } from '../dtos/create.contact.dto';
import { RepoToken } from '../../db-providers/repo.token.enum';
import { ContactAggregateEntities } from './contact.aggregate.type';
import { BusinessRule } from '../business-rules/business-rule.enum';
// import { TransactionStatus } from './transaction-status.type-DELETE-ts'
import { CreateContactEvent } from 'src/events/contact/commands';
import { ContactCreatedEvent } from 'src/events/contact/domainChanges';

// class used to construct aggregate object with related entities from event payload/
// This class also has creational business rules and/or update business rules
@Injectable()
export class ContactAggregate extends AggregateRoot {

  private events: Array<ContactCreatedEvent> = [];

  constructor(
    private contactSaveService: ContactSaveService,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>,
    @Inject(RepoToken.CONTACT_ACCT_REL_REPOSITORY) private contactAcctRelRepository: Repository<ContactAcctRel>,
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
    const { email, accountId, firstName, lastName, mobilePhone } = createContactEvent.message;
    const { sourceType: type, sourceName: name } = createContactEvent.message;
    
    /* create contact instance and set the aggregate property */
    // this.aggregate.contact = this.contactRepository.create(createContactEvent);
    this.aggregate.contact = this.contactRepository.create({
      accountId, email, firstName, lastName,  mobilePhone
    });
    
    /* create contact source relation and set the aggregate property */
    this.aggregate.contactSource = this.contactSourceRepository.create({type, name});

    /* create instance of contact account relation; defer assigining actual contactId till save contact  */
    const placeholderContactId: number = -1;
    this.aggregate.contactAcctRel = this.contactAcctRelRepository.create({
      accountId, contactId:  placeholderContactId
    });

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


  // https://www.postgresql.org/docs/current/queries-table-expressions.html
  async loadAggregateById(id: number) {

    // Initialized ContactAggregate Entities
    let contactAggregateEntities: ContactAggregateEntities = {
      contact: null,
      contactSource: null,
      contactAcctRel: null
    };

    // Define select criteria using database syntax 
    let selectCriteria = `contact.id = ${id}`;

    // Construct Where clause
    let whereClause = '';
    if (selectCriteria) {
      whereClause = 'WHERE ' + selectCriteria;
    }
    
    // Execute query
    const contactArray = await this.dataSource.query(
      `SELECT contact.id as contact_id, version,  first_name, last_name, mobile_phone, 
              contact_acct_rel.id as acct_rel_id, contact_acct_rel.account_id,
              contact_source.id as source_id, type as source_type, name as source_name
       FROM contact 
        INNER JOIN contact_acct_rel on contact.id = contact_acct_rel.contact_id
        INNER JOIN contact_source   on contact.id = contact_source.contact_id 
       ${whereClause};
     `
    );
    let [ contactData ] = contactArray; /* destructure array */
    contactData = camelize(contactData) /* convert to camel case */

    // Extract contact data.
    const { accountId, contactId } = contactData; /* relationship keys */
    const { version, email, firstName, lastName, mobilePhone } = contactData; /*contact data */
    const { sourceId, sourceType, sourceName } = contactData;                 /* source data */
    const { acctRelId } = contactData;                                        /* acctRel data */
    // Construct Entity objects.                                  
    /* contact */
    const contact = { id: contactId, version, email, firstName, lastName, mobilePhone }
    /* contact_acct_rel */
    const contactAcctRel = { id: acctRelId, accountId, contactId }
    /* contact_source */
    const contactSource  = { id: sourceId, contactId,  type: sourceType, name: sourceName };
    // Construct aggregate
    contactAggregateEntities.contact = this.contactRepository.create(contact);
    contactAggregateEntities.contactAcctRel = this.contactAcctRelRepository.create(contactAcctRel);
    contactAggregateEntities.contactSource = this.contactSourceRepository.create(contactSource);
    
    // const contactData = 
    console.log("CONTACT AGGREGATE ", JSON.stringify(contactAggregateEntities, null, 2))
  }

  // TBD
  loadAggregateRoot() {}
  // TBD
  loadPartialAggregate() {}
 
  applyChanges() {};

  /* Layers on idempotent busines rules on top of aggregate returned from ContactAggregate.create method */
  async idempotentCreate(
    contactAggregateEntities: ContactAggregateEntities,
    generatedEvents: Array<ContactCreatedEvent>
  ): Promise<Contact> {
    console.log(">>>> Inside contactAggregate.save()")

    /* pull out individual entities from aggregate */
    const { contact, contactAcctRel, contactSource } = contactAggregateEntities;
    
    /* run contactExistInAcct Check business rule */
    const ruleInputs = { accountId: contactAcctRel.accountId, email: contact.email };
    const ruleResult: any = await this.runAsyncBusinessRule(BusinessRule.contactExistInAcctCheck, ruleInputs);
    const { contactExists, registeredInAcct, contactInstance } = ruleResult;
    
    /* if contact already exists in provided account, return the existing contact instance */
    if (contactExists && registeredInAcct) {  /* If exists, no need to call save; Just return existing aggregate root */
      return contactInstance; 
    } 
    /* if contact already exists but is not registered in provided account, 
       add the contactAcctRel to the aggregate, and remove the other entities except aggreate root*/
    if (contactExists && !registeredInAcct) {  /* If contact exists but registered in account, register in contactAcctRel table */
      
       contactAggregateEntities.contactAcctRel = this.contactAcctRelRepository.create({
        accountId: contact.accountId, contactId: contactInstance.id
      })
      /* add the contact Id to contact entity to force a save vs create */
      contact.id = contactInstance.id;
      contactAggregateEntities.contact = contact;
      contactAggregateEntities.contactSource = null; /* setting to null, to avoid saving again on save */
    }
    console.log("    generated Event ", JSON.stringify(generatedEvents))

    /* returns the aggregate root */
    return await this.contactSaveService.save(contactAggregateEntities, generatedEvents) 
  }
 
 async runAsyncBusinessRule(businessRule, ruleInputs) {
    let ruleResult: any = true;
    switch(businessRule) {
      case BusinessRule.contactExistInAcctCheck:
        ruleResult = await this.findContactByAcctandEmail(ruleInputs)
        break;
      case BusinessRule.updateContactXyzRule:
        /* bizlogic */
        break;
      default:
    }
    return ruleResult;
  }

  // /* generate CreateDomainEvent;  NOTE: create events are scoped to the aggregate root 
  //    If changes to related tables are needed downstream, the client must fetch the entire aggregate. */
  // generateCreateDomainEvent(contactCreatedEvent: ContactCreatedEvent): Array<ContactCreatedEvent> {
  //   return this.events.concat(contactCreatedEvent);
  // }
  

  validate() {};


  //***************************************************************************** 
  // Business Rules
  //***************************************************************************** 
  /* business rule for contact exists check */
  async findContactByAcctandEmail(ruleInputs): Promise<any> {
    console.log(">>>> Inside findContactByAcctandEmail")
    const { accountId, email } = ruleInputs;
    let  ruleResult = { contactInstance: null, contactExists: false, registeredInAcct: false }
    /* check if account exists in contact table */
    const contact =  await this.contactRepository.findOne({
      where: { email }
    });
    /* if contact does exist, return result */
    if (!contact) {
      return ruleResult;
    }
    /* check if contact is registered in account by checking contact_acct_rel */
    const contactAcctRel =  await this.contactAcctRelRepository.findOne({
      where: { accountId, contactId:  contact.id}
    });
    /* provide outcomes in rule result */
    ruleResult = {
      contactInstance: contact ? contact : null,
      contactExists:   contact ? true : false,
      registeredInAcct: contactAcctRel ? true : false
    }
    console.log(` RULE RESULT: ${JSON.stringify(ruleResult)}`)
    return ruleResult;
  }

}

  
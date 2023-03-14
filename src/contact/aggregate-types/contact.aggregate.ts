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
  async loadAggregate() {
    const contact = await this.dataSource.query(
      `select * from contact 
         INNER JOIN contact_source ON contact.id = contact_source.contact_id
         where contact.id = 15;`
    );
    console.log("SELECTED CONTACT ", contact)
  }

  // TBD
  loadAggregateRoot() {}
  // TBD
  loadPartialAggregate() {}
 

  applyChanges() {};

  /* implements idempotent create behavior on top of the generic contactSaveService */
  async idempotentCreate(
    contactAggregateEntities: ContactAggregateEntities,
    generatedEvents: Array<ContactCreatedEvent>
  ): Promise<Contact> {
    console.log(">>>> Inside contactAggregate.save()")

    /* implements idempotent behavior by returning contact, if already exist */
    const { contact } = contactAggregateEntities;
    const ruleInputs = { accountId: contact.accountId, email: contact.email };
    const existingContact: Contact = await this.runAsyncBusinessRule(BusinessRule.contactExistCheck, ruleInputs);
    console.log(`    contactExist value: ${existingContact}`)
    if (existingContact) {  /* If exists, no need to call save or persist domainCreatedEvent. Just return existing aggregate root */
      return existingContact; 
    } 
    console.log("    generated Event ", JSON.stringify(generatedEvents))

    /* returns the aggregate root */
    return await this.contactSaveService.save(contactAggregateEntities, generatedEvents) 
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

  // /* generate CreateDomainEvent;  NOTE: create events are scoped to the aggregate root 
  //    If changes to related tables are needed downstream, the client must fetch the entire aggregate. */
  // generateCreateDomainEvent(contactCreatedEvent: ContactCreatedEvent): Array<ContactCreatedEvent> {
  //   return this.events.concat(contactCreatedEvent);
  // }
  

  validate() {};


  //***************************************************************************** 
  // Helper functions and business rules
  //***************************************************************************** 
  /* business rule for aggregateRoot Exist Check */
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

  
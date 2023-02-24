import { contactRepositories } from './../repos/contact.repositories';
import { ContactAcctRel } from './../entities/contact.acct.rel.entity';
import { ContactSource } from './../entities/contact.source.entity';
import { ContactSaveService } from './../contact.save.service';
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
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
    @Inject(RepoToken.CONTACT_SOURCE_REPOSITORY) private contactSourceRepository: Repository<ContactSource>
  ) {super()};

  aggregate: ContactAggregateEntities = {
     contact: null,
     contactSource: null,
     contactAcctRel: null
  }
 
  /* Constructs aggregate from parts of the event payload.  */
  async create(createContactEvent: CreateContactEvent): Promise<ContactAggregateEntities> {
    /* destructure Dto to extract aggregate entities */
    const { email, accountId, firstName, lastName, webSiteUrl, mobilePhone } = createContactEvent;
    const { sourceType: type, sourceName: name } = createContactEvent;
    
    /* if contact exists, return aggregate with null entities. This will result in bypassing
      save operation effectively implementing an idempotent behavior  */
    // const contactExists: boolean = await this.runAsyncBusinessRule(BusinessRule.createContactNotExistCheck, ruleInputs);
    // if (contactExists) {
    //   return this.aggregate;
    // }

    /* create contact instance and set the aggregate property */
    this.aggregate.contact = this.contactRepository.create(createContactEvent);
    
    /* create contact source and set the aggregate property */
    this.aggregate.contactSource = this.contactSourceRepository.create({type, name});
    
    /* assign default version to new contact aggregate */
    this.aggregate.contact.version = this.getInitialVersion();  // append version from aggregate root

    /* Return aggregate entities instance so it can subsequently be used by save() operation */
    return this.aggregate;
  };

  /* used primary by applyChanges */
  load(){};

  applyChanges() {};

  async save(contactAggregateEntities: ContactAggregateEntities): Promise<TransactionStatus> {
    console.log(">>>> Inside contactAggregate.save()")
    /* implements idempotent behavior */
    const { contact } = contactAggregateEntities;
    const ruleInputs = { accountId: contact.accountId, email: contact.email };
    const contactExist: boolean = await this.runAsyncBusinessRule(BusinessRule.contactExistCheck, ruleInputs);
    console.log(`    contactExist value: ${contactExist}`)
    // if (contactExists) {
    //   return this.aggregate;
    // }
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
  
  async findContactByAcctandEmail(ruleInputs) {
    console.log(">>>> Inside findContactByAcctandEmail")
    const { accountId, email } = ruleInputs;
    const contact =  await this.contactRepository.findOne({
      where: { accountId, email }
    })
    console.log(`     contact: ${contact}`)
    return contact ? true : false
  }


}

  
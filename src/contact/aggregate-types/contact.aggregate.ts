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
  // contact: Contact;
  // contactSource: ContactSource;
  // contactAcctRel: ContactAcctRel;

  /* Constructs aggregate from the create Dto.  */
  async create(createContactDto: CreateContactDto): Promise<ContactAggregateEntities> {
    /* destructure Dto to extract aggregate entities */
    const { email, accountId, firstName, lastName, webSiteUrl, mobilePhone } = createContactDto;
    const { sourceType: type, sourceName: name } = createContactDto;
    
    /* if contact exists, return aggregate with null entities. This will result in bypassing
      save operation effectively implementing an idempotent behavior  */
    const contactExists: boolean = await this.runAsyncBusinessRule(BusinessRule.createContactNotExistCheck);
    if (contactExists) {
      return this.aggregate;
    }

    /* create contact instance */
    this.aggregate.contact = this.contactRepository.create(createContactDto);
    
    /* create contact source */
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
    return await this.contactSaveService.save(contactAggregateEntities) 
  }
 
 async runAsyncBusinessRule(businessRule) {
    let ruleResult: any;
    switch(businessRule) {
      case BusinessRule.createContactNotExistCheck:
        ruleResult = true;
        await Promise.resolve(ruleResult)
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
  // Helper functions
  //***************************************************************************** 
  


}

  
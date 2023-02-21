import { ContactSaveService } from './../contact.save.service';
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { ContactSource } from '../entities/contact.source.entity';
import { ContactAcctRel } from '../entities/contact.acct.rel.entity';
import { AggregateRoot } from 'src/aggregrate/aggregateRoot';
import { CreateContactDto } from '../dtos/create.contact.dto';
import { RepoToken } from '../repos/repo.token.enum';
import { ContactAggregateEntities } from './contact.aggregate.type';

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

  create(createContactDto: CreateContactDto): ContactAggregateEntities {
    
    /* create contact */
    const { email, accountId, firstName, lastName, webSiteUrl, mobilePhone } = createContactDto;
    this.aggregate.contact = this.contactRepository.create(createContactDto);

    /* create contact source */
    const { sourceType: type, sourceName: name } = createContactDto;
    this.aggregate.contactSource = this.contactSourceRepository.create({type, name});

    /* assign default version to new contact aggregate */
    this.aggregate.contact.version = this.getInitialVersion();  // append version from aggregate root
    return this.aggregate;

  };

  load(){};

  applyChanges() {};

  async save(contactAggregateEntities: ContactAggregateEntities) {
    return await this.contactSaveService.save(contactAggregateEntities) 
  }

  // async save(contactAggregateEntities: ContactAggregateEntities) {
  //   /* save contact  */
  //   const savedContact: Contact = await this.contactRepository.save(contactAggregateEntities.contact)

  //   /* assign contact id to contactSource */
  //   contactAggregateEntities.contactSource.contactId = savedContact.id;
  //   /* save contactSource */
  //   const savedContactSource: ContactSource = await this.contactSourceRepository.save(contactAggregateEntities.contactSource)
  //   return contactAggregateEntities;
  // };

  validate(){};

}

  
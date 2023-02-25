import { ContactSaveService } from './contact.save.service';
import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
// import { AggregateService } from '../aggregrate/aggregate.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
// import { TransactionStatus } from './aggregate-types/transaction-status.type';
import { CreateContactEvent } from 'src/events/contacts/create-contact-event';
import { StandardResponse } from 'src/common/response/command.response';

@Injectable()
export class ContactService {
  
  /* Create Dto */
  private createContactDto: CreateContactDto;

  constructor(
    private contactAggregate: ContactAggregate,
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}
  
  async getAggregate<T>(id: number){
    return this.contactAggregate.findById(id);

  }

  // service used to create aggreate, then save it.
  async create(createContactEvent: CreateContactEvent): Promise<StandardResponse> {
    console.log(">>>> Inside contactService.create method");
    console.log(`    var createContactEvent: ${JSON.stringify(createContactEvent)}`);
    /* create the aggregate */
    const aggregate: ContactAggregateEntities = await this.contactAggregate.create(createContactEvent);
    console.log("This is returned contact aggregate ", aggregate);
    /* save the entire aggregate and return aggregate root */
    let aggregateRoot: Contact = await this.contactAggregate.save(aggregate);
    let standardResponse: StandardResponse = { 
      id: aggregateRoot.id, 
      link: { href: `http://contact/${aggregateRoot.id}`, rel: "self" } 
    }
    return standardResponse;
  }
  
}
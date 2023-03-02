import { ContactSaveService } from './contact.save.service';
import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
// import { AggregateService } from '../aggregrate/aggregate.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
// import { Transactioncreate from './aggregate-types/transaction-createype';
import { CreateContactEvent } from 'src/events/contacts/create-contact-event';
import { CreateEntityResponse } from 'src/common/responses/command.response';
import { ClientError } from '../common/errors/client.error';
import { ClientErrorReasons } from '../common/errors/client.error.reasons';


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
  async create(createContactEvent: CreateContactEvent): Promise<CreateEntityResponse> {
    console.log(">>>> Inside contactService.create method");
    console.log(`    var createContactEvent: ${JSON.stringify(createContactEvent)}`);
    /* create the aggregate */
    const aggregate: ContactAggregateEntities = await this.contactAggregate.create(createContactEvent);
    console.log("This is returned contact aggregate ", aggregate);
    /* save the entire aggregate and return aggregate root */
    let aggregateRoot: Contact = await this.contactAggregate.idempotentSave(aggregate);
    let createEntityResponse: CreateEntityResponse = { 
      id: aggregateRoot.id, 
      link: { href: `http://contact/${aggregateRoot.id}`, rel: "self" } 
    }
    console.log("++++++++++++++++++++++++++++")
    let someError = new ClientError(400);
    someError.setReason(ClientErrorReasons.InvalidRequest)
    console.log(someError)
    console.log("++++++++++++++++++++++++++++")
    return createEntityResponse;
  }
  
}
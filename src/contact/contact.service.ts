import { CreateContactResponse } from './../common/responses/command.response';
import { ContactSaveService } from './contact.save.service';
import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
// import { AggregateService } from '../aggregrate/aggregate.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
// import { Transactioncreate from './aggregate-types/transaction-createype';
import { CreateContactEvent } from 'src/events/contact/commands';
import { CreateEntityResponse } from 'src/common/responses/command.response';
import { ServerError } from '../common/errors/server.error';
import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
import { ContactCreatedEvent } from '../events/contact/domainChanges';
import { CustomNatsClient } from 'src/custom.nats.client.service';
import { OutboxCommands } from '../events/outbox/commands';
import { PublishUnpublishedEventsCmdPayload } from '../events/outbox/commands'


@Injectable()
export class ContactService {
  
  private generatedEvents: Array<ContactCreatedEvent> = [];

  /* Create Dto */
  // private createContactDto: CreateContactDto;

  constructor(
    private contactAggregate: ContactAggregate,
    private customNatsClient: CustomNatsClient
  
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}
  
  async getAggregate<T>(id: number){
    return this.contactAggregate.findById(id);
  }

  // service used to create aggreate, then save it.
  async create(createContactEvent: CreateContactEvent):  Promise<CreateEntityResponse | ServerError> {
    console.log(">>>> Inside contactService.create method");
    console.log(`    var createContactEvent: ${JSON.stringify(createContactEvent)}`);

    /* create the aggregate */
    const aggregate: ContactAggregateEntities = await this.contactAggregate.create(createContactEvent);
    console.log("This is returned contact aggregate ", aggregate);

    /* generate CreatedEvent and save in array */
    let {accountId, email, firstName, lastName } = createContactEvent;
    const contactCreatedEvent: ContactCreatedEvent = { accountId, email, firstName, lastName };
    this.generatedEvents = this.generatedEvents.concat(contactCreatedEvent);

    /* save the aggregate members, the generated events to outbox, and return aggregate root */
    let aggregateRoot: Contact = await this.contactAggregate.idempotentCreate(aggregate, this.generatedEvents);

    /* if save was NOT successful, return error response */
    if (!aggregateRoot) {
      return new ServerError(500);
    }
    
    /* Trigger Outbox handler to read unpublished events from outbox and publish to ESB */
    let commandPayload: PublishUnpublishedEventsCmdPayload = { accountId }
    let commandResult = await this.customNatsClient.sendCommand(
      OutboxCommands.publishUnpublishedEvents, commandPayload
    );

    /* create response object using aggregateRoot.id */
    let createEntityResponse: CreateContactResponse = new CreateContactResponse(aggregateRoot.id);

    return createEntityResponse;
  }
}
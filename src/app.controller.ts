import { NatsJetStreamContext } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { Controller, Get, UseFilters } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ExecuteCommand, ListenForEvent } from './decorators';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { AppService } from './app.service';
import { Subjects } from './events/orders/subjects'; 
import { CreateOrderEvent, UpdateOrderEvent, DeleteOrderEvent } from './events/orders';
import { OrderCreatedEvent, OrderUpdatedEvent, OrderDeletedEvent } from './events/orders';
import { Patterns } from './commands/orders/patterns';
import { ExceptionFilter } from './common/filters';
import { Contact } from './contact/entities/contact.entity';
import { CreateContactDto } from './contact/dtos/create.contact.dto';
// import { DomainMgtService } from './domain-mgt/domain-mgt.service';
import { ContactService } from './contact/contact.service';
import { ContactCommand } from './commands/contacts/contact-commands';
import { CreateContactEvent } from './events/contacts/create-contact-event';
import { ContactQueries } from './commands/contacts/contact-queries';
import { QueryContactByIdEvent } from './events/contacts/query-contact-by-id';



@UseFilters(new ExceptionFilter())
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly contactService: ContactService
    ) {}

  /* Rest End Point */
  @Get()
  home(): string {
    return 'Welcome to webshop';
  }

  //************************************************************** */
  // Contact command handlers and event listeners
  //************************************************************** */
  // Command Handlers
  @ExecuteCommand(ContactQueries.findContactById)
  async findContactById(
    @Payload() data: QueryContactByIdEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const subject = context.message.subject;
    console.log(`MS - Received command ${ContactQueries.findContactById} on Orders Microservice`);
    console.log('MS - ....with payload', data);
    let cmdResult = "Query reached microservice";
    // const cmdResult: any  =  this.contactService.create(data)

    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false

    // here you return the CreatedOrderEvent.
    return cmdResult;
  }


  //************************************************************** */
  // Contact Query command handlers and event listeners
  //************************************************************** */
  // Query Handlers
  @ExecuteCommand(ContactCommand.createContact)
  async createContactCommandHandler(
    @Payload() data: CreateContactEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const subject = context.message.subject;
    console.log(`MS - Received command ${ContactCommand.createContact} on Orders Microservice`);
    console.log('MS - ....with payload', data);
    const cmdResult: any  =  this.contactService.create(data)

    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false

    // here you return the CreatedOrderEvent.
    return cmdResult;
  }

  //Event Listeners

  // @Get('/createcontact')
  // async createContact() {  
  //   console.log(">> Inside Create contact in controller")
  //   const contact  =  this.contactService.create(createContactDto)
  //   return contact;
  // }


  @Get('/sandboxresults')
  async sandbox() {  
    const isNull = value => value === null;

    let sampleAggregate = { a: null, b: null };

    /* transfer entity values into array */
    let entityArrayValues = [];
    Object.keys(sampleAggregate).forEach((key:string) => entityArrayValues.push(sampleAggregate[key]) );


    console.log(">> Below are entity values ")
    console.log(entityArrayValues);

    /* check if all values are null */
    let result = entityArrayValues.every(isNull)
    console.log(">> All aggregates null ", result)
    return 'completed displaying results';
  }


  // @Get('/createaggregate')
  // async createAggregate() {  
  //   console.log(">> Inside Create contact in controller")
  //   const createContactDto = {
  //     accountId: 1001,
  //     firstName: 'Dan',
  //     lastName: 'Borges',
  //     webSiteUrl: 'www.pitchinclub.com',
  //     mobilePhone: '9175554343'
  //   }
  //   return this.contactService.create(createContactDto)
  // }

  // @Get('/version')
  // async getAggregateVersion() {  
  //   console.log(">> Inside Create contact in controller")
  //   // return this.domainMgtService.test()
  //   return this.contactAggregateService.getVersion()
  // }

  // @Get('/test')
  // async callTest() {  
  //   console.log(">> Inside Create contact in controller")
  //   // return this.domainMgtService.test()
  //   return this.contact.test()
  // }

 

  // Response Side of Request Response Service - 
  // Hosted on Microservice instance -  Listens for 'sum' command
  // @MessagePattern({ cmd: 'sum' })
  // @ExecuteCommand({ cmd: 'sum' })
  // async accumulate(data: number[]): Promise<number> {
  //   console.log('command controller', data);
  //   return (data || []).reduce((a, b) => a + b);
  // }

  //************************************************************** */
  // Order command handlers and event listeners
  //************************************************************** */
  //Listens for command Pattern
  @ExecuteCommand({ cmd: Patterns.CreateOrder })
  async createOrderCommandHandler(
    @Payload() data: CreateOrderEvent,
    @Ctx() context: NatsJetStreamContext
  ): Promise<any> {
    const subject = context.message.subject;
    console.log(`MS - Received command ${subject} on Orders Microservice`);
    console.log('MS - ....with payload', data);
    const result = await this.appService.createOrder()

    // Here you create Order and insert CreatedOrderEvent to the event database
    // as a single transaction. The publish flag will be false false

    // here you return the CreatedOrderEvent.
    return "order XYZ created";
  }

  // Listens for event published on Nats
  // IMPORTANT: Listeners that are updating downstream data stores should be 
  // version their entities to ensure CUD events are processed in order
  // SEE UDEMY LESSON 42 and refer to link below on Typeorm optimistic concurrency control
  // https://github.com/typeorm/typeorm/issues/3608
  // @EventPattern('order.created')
  @ListenForEvent(Subjects.OrderCreated)
  public async orderCreatedHandler(
    @Ctx() context: NatsJetStreamContext,
    @Payload() data: OrderCreatedEvent,
  ) {
    console.log(`MS - OrderCreatedEvent Listener received event subject: ${context.message.subject} data: ${data}`);
    /* process message */
    /* mark outbox entry as completed  */
    context.message.ack();  /* acknowledge message */
    console.log(`MS - OrderCreatedEvent Listener processed and acknowledged event: ${context.message.subject} data: ${data}`);
  }

  // Subscribes to order.updated
  // @EventPattern('order.updated')
  // @ListenForEvent(Subjects.OrderUpdated)
  // public async orderUpdatedHandler(
  //   @Ctx()      context: NatsJetStreamContext,
  //   @Payload()  data: OrderUpdatedEvent,
  // ) {
  //   context.message.ack();
  //   console.log('received: ' + context.message.subject, data);
  // }

  // Subscribes to order.created 
  // @EventPattern('order.created')
  // @ListenForEvent(Subjects.OrderCreated)
  // public async orderCreatedHandler(
  //   @Ctx() context: NatsJetStreamContext,
  //   @Payload() data: OrderCreatedEvent,
  // ) {
  //   /* process message */
  //   /* mark outbox entry as completed  */
  //   context.message.ack();  /* acknowledge message */
  //   console.log('received: ' + context.message.subject, data);
  // }

  // Subscribes to order.deleted
  // @ListenForEvent(Subjects.OrderDeleted)
  // public async orderDeletedHandler(
  //   @Ctx() context: NatsJetStreamContext,
  //   @Payload() data: OrderDeletedEvent,
  // ) {
  //   context.message.ack();
  //   console.log('received: ' + context.message.subject, data);
  // }




}
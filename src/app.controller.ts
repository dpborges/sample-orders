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

@UseFilters(new ExceptionFilter())
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /* Rest End Point */
  @Get()
  home(): string {
    return 'Welcome to webshop';
  }

  @Get('/createcontact')
  async createContact() {  
    console.log(">> Inside Create contact in controller")
    const contact: Contact = await this.appService.createContact()
    console.log("    returned contact from createContact ", contact);
    return contact;
  }

  // Response Side of Request Response Service - 
  // Hosted on Microservice instance -  Listens for 'sum' command
  // @MessagePattern({ cmd: 'sum' })
  // @ExecuteCommand({ cmd: 'sum' })
  // async accumulate(data: number[]): Promise<number> {
  //   console.log('command controller', data);
  //   return (data || []).reduce((a, b) => a + b);
  // }

  //Listens for command Pattern
  @ExecuteCommand({ cmd: Patterns.CreateOrder })
  async createOrderCommand(
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
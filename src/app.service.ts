import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { CustomNatsClient } from './custom.nats.client.service';
import { Repository } from 'typeorm';
import { Injectable, Inject} from '@nestjs/common';
import { PubAck } from 'nats';
import { Observable } from 'rxjs';
import { OrderCreatedEvent } from './events/orders';
import { Subjects } from './events/orders/subjects';
import { RpcException } from '@nestjs/microservices';
import { RepoToken } from './contact/repos/repo.token.enum';
import { Contact } from './contact/entities/contact.entity';

@Injectable()
export class AppService {
  constructor(
    // private client: NatsJetStreamClient,
    private customNatsClient: CustomNatsClient,
    @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}

  // Database update and publish OrderCreatedEvent 
  async createOrder(): Promise<any> {
    // throw new RpcException('ERROR: Unexected exception on Create Order')
    /* Construct OrderCreatedEvent body */
    const orderCreatedEvent: OrderCreatedEvent = {
          id: 1,
          product: 'Socks',
          quantity: 1,
    };

    /* Create order and write OrderCreatedEvent to outbox as single transaction */

    /* Upon successful order created, publish OrderCreatedEvent */

    /* emit orderCreatedEvent */ 
    console.log(`MS - Saved new order to database`);
    // throw new RpcException('Unexected exception on Create Order Service')
    console.log("MS - Emit Created Order Event ")
    let publishResult = await this.customNatsClient.publishEvent(Subjects.OrderCreated, orderCreatedEvent);
    console.log(`MS - Response from publishing orderCreatedEvent: ${publishResult}`);

    /* If event was succesfully published, update outbox to published = true */ 
    console.log("MS - Update Outbox with successful ")


    // this.client
    //   .emit<OrderCreatedEvent>(Subjects.OrderCreated, {
    //     id: 1,
    //     product: 'Socks',
    //     quantity: 1,
    //   })
    //   .subscribe((pubAck) => {
    //     console.log(">> This is the publish acknowledgement", pubAck);
    //   });


    return 'order XYZ created.';
  }

  async createContact(): Promise<any> {
    // throw new RpcException('ERROR: Unexected exception on Create Order')
    /* Construct OrderCreatedEvent body */
  
    // SAMPLE CREATE - The save below will create a new entity, even though 
    // I specified the id. 
    const contact: Contact = this.contactRepository.create({
      accountId: 1010,
      email: "joe.bono@gmail.com",
      firstName: 'Joe',
      lastName: 'Bono',
      webSiteUrl: 'www.jbccc.com',
      mobilePhone: '6464301661',
      contactSourceId: 1
    })
    const  savedContactEntity = await this.contactRepository.save(contact);
    return savedContactEntity;

    // SAMPLE UPDATE
    // const updatedResult: any = await this.contactRepository.update(
    //   {id: 1},
    //   {firstName: "Fui"}
    // )
    // return updatedResult;


    // SAMPLE PRELOAD - This results in updating version number by preloading
    // entity, updating the instance, then saving it back to db.
    // This 
    // const partialContact = { id: 1, email: 'joe.bono@gmail.com' }
    // let preLoadedResult: any = await this.contactRepository.preload(partialContact);
    // console.log("Preloaded Result ", preLoadedResult);
    // preLoadedResult.lastName = 'Fowi';
    // let  updatedContactEntity = await this.contactRepository.save(preLoadedResult);
    // console.log("updatedContactEntity ", updatedContactEntity);
    // return updatedContactEntity;

  }

  // updateOrder(): string {
  //   this.client
  //     .emit<OrderUpdatedEvent>(ORDER_UPDATED, { id: 1, quantity: 10 })
  //     .subscribe();
  //   return 'order updated';
  // }

  // deleteOrder(): string {
  //   this.client
  //     .emit<OrderDeleteEvent>(ORDER_DELETED, { id: 1 })
  //     .subscribe((pubAck) => {
  //       console.log(pubAck);
  //     });
  //   return 'order deleted';
  // }

  // request - response
  // accumulate(payload: number[]): Observable<PubAck> {
  //   const pattern = { cmd: 'sum' };
  //   return this.client.send<number[]>(pattern, payload);
  // }
}


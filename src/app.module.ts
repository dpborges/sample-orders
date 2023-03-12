import { Module } from '@nestjs/common';
import { DatabaseModule } from './db-providers/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NatsJetStreamTransport } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { CustomNatsClient } from './custom.nats.client.service';
import { contactRepositories } from './contact/repos/contact.repositories';
// import { DomainMgtService } from './domain-mgt/domain-mgt.service';
import { ContactService } from './contact/contact.service';
import { ContactAggregate } from './contact/aggregate-types/contact.aggregate';
import { ContactSaveService } from './contact/contact.save.service';
import { OutboxService } from './outbox/outbox.service';
import { DomainChangeEventPublisher } from './outbox/domainchange.event.publisher';
import { EventStatusUpdater } from './outbox/event.status.updater';
// import { AggregateService } from './domain-mgt/aggregrate/aggregate.service';

// I assume this is used in the gateway, as it is functioning as the client

@Module({
  imports: [
    DatabaseModule,
    NatsJetStreamTransport.register({
      connectionOptions: {
        servers: 'localhost:4222',
        name: 'myservice-publisher',
      },
    }),
  ],
  controllers: [AppController],
  providers: [
      ...contactRepositories,
      AppService,
      NatsJetStreamClient, 
      CustomNatsClient,
      ContactAggregate,
      ContactService,
      ContactSaveService,
      OutboxService,
      DomainChangeEventPublisher,
      EventStatusUpdater
  ],
})
export class AppModule {}
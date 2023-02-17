import { Module } from '@nestjs/common';
import { DatabaseModule } from './db-providers/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NatsJetStreamTransport } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { NatsJetStreamClient } from '@nestjs-plugins/nestjs-nats-jetstream-transport';
import { CustomNatsClient } from './custom.nats.client.service';
import { contactRepositories } from './contact/repos/contact.repositories';

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
      CustomNatsClient
  ],
})
export class AppModule {}
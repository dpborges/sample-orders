import { UpdateEventStatusCmdPayload } from './events/commands/update.status.payload';
import { OutboxService } from './outbox.service';
// import { ContactCreatedEvent } from '../events/contact/domainChanges/contact-created-event';
import { Repository } from 'typeorm';
import { Injectable, Inject } from '@nestjs/common';
// import { CreateContactEvent } from '../events/contact/commands/create-contact-event';
// import { ServerError } from '../common/errors/server.error';
// import { ClientErrorReasons } from '../common/errors/client.error.standard.text';
// import { PublishUnpublishedEventsCmdPayload } from '../events/outbox/commands';
import { RepoToken } from '../db-providers/repo.token.enum';
import { ContactOutbox } from './entities/contact.outbox.entity';
// import { OutboxStatus } from './outbox.status.enum';
// import { Subjects } from '../events/contact/domainChanges';
// import { SubjectAndPayload } from './types/subject.and.payload';
import { CustomNatsClient } from '../custom.nats.client.service';

@Injectable()
export class EventStatusUpdater {
  
  constructor(
    // private outboxService: OutboxService,
    private customNatsClient: CustomNatsClient,
    @Inject(RepoToken.CONTACT_OUTBOX_REPOSITORY) private contactOutboxRepository: Repository<ContactOutbox>,
  ) {}
  
  async updateStatus(updateEventStatusCmdPayload: UpdateEventStatusCmdPayload): Promise<void> {
    let { outboxId, status } = updateEventStatusCmdPayload;
    
    /* set status where id = outboxId */
    const { affected: rowsUpdated } = await this.contactOutboxRepository.update(outboxId, { status });
    if (rowsUpdated !== 1) {
      //LOG WARNING
      console.log(`WARNING: Expected 1 rowUpdated but received ${rowsUpdated} when changing status for outboxId:${outboxId} `)
    }
  }
}
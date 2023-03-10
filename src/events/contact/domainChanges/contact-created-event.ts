 /* Note, outboxId is used by outbox handler. Outbox handler appends the outbox id
    to the message when publishing from outbox. This allows downstream consumers
    to update status using the outboxId */
import { MessageHeader } from "src/events/common/message.header";

export interface ContactCreatedPayload {
  accountId:    number;
  email:        string;
  firstName:    string;
  lastName:     string;
}

export interface ContactCreatedEvent {
  header:   MessageHeader;
  message:  ContactCreatedPayload;
}


import { Contact } from "../entities/contact.entity";
import { ContactSource } from "../entities/contact.source.entity";
import { ContactAcctRel } from "../entities/contact.acct.rel.entity";
import { ContactOutbox } from "../../outbox/entities/contact.outbox.entity"

/* Note, contactOutbox is only needed if planning to published domain changes to 
   downstream consumers. */
export type ContactAggregateEntities = {
  contact:          Contact;
  contactSource?:   ContactSource;
  contactAcctRel?:  ContactAcctRel;
  contactOutbox?:   ContactOutbox; 
}


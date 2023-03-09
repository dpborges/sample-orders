import { Contact } from "../entities/contact.entity";
import { ContactSource } from "../entities/contact.source.entity";
import { ContactAcctRel } from "../entities/contact.acct.rel.entity";
import { ContactOutbox } from "../../outbox/entities/contact.outbox.entity"

/* Note, contactOutbox is an array because there may be more than one event instance
   created for a single save transaction. (eg create/update ContactEmployeeInfo and 
   ContactPersonalInfo )*/
export type ContactAggregateEntities = {
  contact:          Contact;
  contactSource?:   ContactSource;
  contactAcctRel?:  ContactAcctRel;
  contactOutbox?:   ContactOutbox; 
}


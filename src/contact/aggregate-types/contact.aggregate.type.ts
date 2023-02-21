import { Contact } from "../entities/contact.entity";
import { ContactSource } from "../entities/contact.source.entity";
import { ContactAcctRel } from "../entities/contact.acct.rel.entity";

export type ContactAggregateEntities = {
  contact: Contact;
  contactSource?: ContactSource;
  contactAcctRel?: ContactAcctRel;
}
import { Contact } from '../entities/contact.entity';
import { ContactSource } from '../entities/contact.source.entity';
import { ContactAcctRel } from '../entities/contact.acct.rel.entity';

export interface ContactAggregateTypes {
  contact: {
    accountId: number;
    firstName: string;
    lastName: string;
    webSiteUrl: string;
    mobilePhone: string;
    };

  contactSource: ContactSource;

  contactAcctRel: ContactAcctRel;

}

  
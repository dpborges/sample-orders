import { MessageHeader } from '../../common/message.header';

export interface CreateContactPayload {
  accountId:    number;
  email:        string;
  firstName:    string;
  lastName:     string;
  mobilePhone:  string;
  sourceType:   string;
  sourceName:   string;
}

export interface CreateContactEvent {
  header?: MessageHeader;
  message: CreateContactPayload ;
}
export interface CreateContactEvent {
  accountId:    number;
  email:        string;
  firstName:    string;
  lastName:     string;
  webSiteUrl:   string;
  mobilePhone:  string;
  sourceType:   string;
  sourceName:   string;
}

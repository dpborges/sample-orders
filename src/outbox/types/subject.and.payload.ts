import { ContactCreatedEvent } from '../../events/contact/domainChanges/contact-created-event';
import { Subjects } from '../../events/contact/domainChanges';

export interface SubjectAndPayload {
  subject: String,
  payload: ContactCreatedEvent
}
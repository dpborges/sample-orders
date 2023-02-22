import { ContactSaveService } from './contact.save.service';
import { createConnection } from 'typeorm';
import { CreateContactDto } from './dtos/create.contact.dto';
// import { AggregateService } from '../aggregrate/aggregate.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregate } from './aggregate-types/contact.aggregate';
import { ContactAggregateEntities } from './aggregate-types/contact.aggregate.type';
import { TransactionStatus } from './aggregate-types/transaction-status.type';

@Injectable()
export class ContactService {
  
  /* Create Dto */
  private createContactDto: CreateContactDto;

  constructor(
    private contactAggregate: ContactAggregate,
    private contactSaveService: ContactSaveService
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {}
  
  // async create(createContactDto: CreateContactDto): Promise<ContactAggregateEntities> {
  async create(createContactDto: CreateContactDto): Promise<TransactionStatus> {
    /* create the aggregate */
    const aggregate: ContactAggregateEntities = await this.contactAggregate.create(createContactDto);
    console.log("This is returned contact aggregate ", aggregate);
    /* save the aggregate */
    let transactionStatus: TransactionStatus = await this.contactSaveService.save(aggregate);
    return transactionStatus;
  }
  
}
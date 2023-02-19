import { createConnection } from 'typeorm';
import { CreateContactDto } from './../dtos/create.contact.dto';
import { AggregateService } from '../aggregrate/aggregate.service';
import { Contact } from './entities/contact.entity';
import { Injectable } from '@nestjs/common';
import { ContactAggregateTypes } from './aggregate-types/contact.aggregate.types';

// @Injectable()
export class ContactAggregateService extends AggregateService<Contact> {
  
  /* Define aggegrate Entities */
  private createContactDto: CreateContactDto;

  // private supportedEntities: ContactAggregateTypes;
  // private supportedEntities: {
  //   contact: {
  //       accountId: number;
  //       firstName: string;
  //       lastName: string;
  //       webSiteUrl: string;
  //       mobilePhone: string;
  //   };
  // }

  constructor(
    private contactAggregateService: ContactAggregateService
    // @Inject(RepoToken.CONTACT_REPOSITORY) private contactRepository: Repository<Contact>,
  ) {super();}
  
  getInfo(createContactDto: CreateContactDto): string {
    // const entityTypes = keyof supportedEntities;
    // this.supportedEntities.contact
    console.log("This is createContactDto");
    console.log("   ", createContactDto);
    // this.supportedEntities.contact = createContactDto;
    // this.contact = createContactDto;
    // const entityTypes = Object.keys(this.supportedEntities);
    // console.log("These are supported entity types");
    // console.log(entityTypes);
    return 'get info completed';
  }


  
  
}
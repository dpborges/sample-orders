import { ContactSource } from './../entities/contact.source.entity';
import { DataSource } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { ContactOutbox } from '../../outbox/entities/contact.outbox.entity'
// import { ContactSource } from '../entities/contact.source.entity';
import { RepoToken } from '../../db-providers/repo.token.enum';


export const contactRepositories = [
  {
    provide: RepoToken.CONTACT_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Contact),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: RepoToken.CONTACT_SOURCE_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ContactSource),
    inject: ['DATA_SOURCE'],
  }
  ,
  {
    provide: RepoToken.CONTACT_OUTBOX_REPOSITORY,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ContactOutbox),
    inject: ['DATA_SOURCE'],
  }
  // {
  //   provide: RepoToken.CONTACT_SOURCE_REPOSITORY,
  //   useFactory: (dataSource: DataSource) => dataSource.getRepository(ContactSource),
  //   inject: ['DATA_SOURCE'],
  // }
];
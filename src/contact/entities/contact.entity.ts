import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryColumn, 
  PrimaryGeneratedColumn,
  Index, 
  VersionColumn,
  ManyToMany,
  JoinTable
} from 'typeorm'; 

/* Creates primary key on id and an index on email and an index on accountId */
@Entity()
export class Contact {
 
  @PrimaryGeneratedColumn()
  id: number;

  @VersionColumn()
  version: number

  @Index({name: 'idx_email'})
  @Column()
  email: string;
   
  @Index({name: 'idx_account_id'})
  @Column()
  accountId: number;

  @Column()  
  firstName: string;

  @Column()  
  lastName: string;
  
  @Column()
  webSiteUrl: string;

  @Column()
  mobilePhone: string;

  @Column()
  contactSourceId: number;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

}

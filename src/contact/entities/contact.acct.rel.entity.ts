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
export class ContactAcctRel {
 
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  accountId: number;

  @Column()  
  contactId: number;

  @CreateDateColumn()
  createDate: Date;

}

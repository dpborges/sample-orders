import { 
  Entity, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  PrimaryColumn, 
  PrimaryGeneratedColumn,
  VersionColumn,
  ManyToMany,
  JoinTable
} from 'typeorm'; 

/* Creates primary key on id and an index on accountId. The index on
  accountId is used to check for unpublished events for a given account */

@Entity()
export class ContactOutbox {
 
  @PrimaryGeneratedColumn()
  id: number;

  @Column()  
  accountId: number;   /* account id that generated the event */

  @Column()  
  userId: string;      /* user id that generated the event */

  @Column()  
  event: string;
  
  @Column()
  payload: string;
  
  @Column({ default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;

}

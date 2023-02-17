import {
  MigrationInterface, 
  QueryRunner, 
} from "typeorm";
// import { InsertStatement } from './seed-data/account-table';

/**
 * To run change file suffix from -ts to .ts and issue one of the commands below
 *   Command for Dev : npm run typeorm  migration:run
 *   Command for Test: npm run typeorm:test migration:run
 * Change suffix back to -ts
 */

const TABLE_NAME  = "contact";
const TABLE_OWNER = "postgres";

// USE BELOW CONSTRAINT WHEN ADDING EXTENSION TABLE
// CONSTRAINT fk_contact_extension_id FOREIGN KEY (contact_extension_id) REFERENCES contact_extension (id)

export class Contact1676403976245 implements MigrationInterface {
  /* Create Table */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log(`TABLE MIGRATION FOR => ${TABLE_NAME} TABLE`);

    await queryRunner.query(`
      CREATE TABLE  ${TABLE_NAME}
      (
        id            SERIAL PRIMARY KEY,
        version       integer NOT NULL,
        email         character varying NOT NULL,
        account_id    integer  NOT NULL,
        first_name    character varying  NOT NULL,
        last_name     character varying,
        website_url   character varying,
        mobile_phone  character varying,
        contact_source_id  integer  NOT NULL,
        create_date timestamp with time zone NOT NULL DEFAULT now(),
        update_date timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT fk_contact_source_id FOREIGN KEY (contact_source_id) REFERENCES contact_source (id)
      )
      TABLESPACE pg_default;
      ALTER TABLE ${TABLE_NAME} OWNER to ${TABLE_OWNER};
      CREATE UNIQUE INDEX "idx_email"
        ON ${TABLE_NAME} USING btree
        (email ASC)
        TABLESPACE pg_default;
      CREATE UNIQUE INDEX "idx_account_id"
        ON ${TABLE_NAME} USING btree
        (account_id ASC)
        TABLESPACE pg_default;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(`REVERT MIGRATION FOR '${TABLE_NAME}' TABLE `);
    // await queryRunner.dropTable(TABLE_NAME);
    await queryRunner.query(`
        DROP TABLE ${TABLE_NAME} CASCADE ;
    `);
  }
}

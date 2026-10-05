import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds credentials to users and the refresh_sessions table.
// `password_hash` is NOT NULL: no users could exist before authentication did.

export class AddAuthentication1791175509897 implements MigrationInterface {
  name = 'AddAuthentication1791175509897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "refresh_sessions" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "token_hash" character(64) NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD "password_hash" character varying(255) NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_sessions"
            ADD CONSTRAINT "FK_refresh_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_refresh_sessions_user_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "password_hash"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_refresh_sessions_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_sessions"
        `);
  }
}

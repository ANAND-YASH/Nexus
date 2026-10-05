import { MigrationInterface, QueryRunner } from 'typeorm';

// One current AI analysis per document. The composite FK (document_id,
// owner_id) → documents (id, owner_id) ties the analysis to the document's
// owner and deletes it with the document. run_id identifies the current run
// so superseded/duplicate jobs can't overwrite newer results.

export class AddDocumentAiAnalysis1791180773594 implements MigrationInterface {
  name = 'AddDocumentAiAnalysis1791180773594';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."document_analysis_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
        `);
    await queryRunner.query(`
            CREATE TABLE "document_ai_analysis" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "document_id" uuid NOT NULL,
                "owner_id" uuid NOT NULL,
                "status" "public"."document_analysis_status" NOT NULL DEFAULT 'PENDING',
                "run_id" uuid NOT NULL,
                "model" character varying(100) NOT NULL,
                "summary" text,
                "key_points" jsonb,
                "topics" jsonb,
                "entities" jsonb,
                "action_items" jsonb,
                "important_dates" jsonb,
                "error" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_document_ai_analysis_document_id_owner_id" UNIQUE ("document_id", "owner_id"),
                CONSTRAINT "PK_document_ai_analysis" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_document_ai_analysis_owner_id_status" ON "document_ai_analysis" ("owner_id", "status")
        `);
    await queryRunner.query(`
            ALTER TABLE "document_ai_analysis"
            ADD CONSTRAINT "FK_document_ai_analysis_document" FOREIGN KEY ("document_id", "owner_id") REFERENCES "documents"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "document_ai_analysis" DROP CONSTRAINT "FK_document_ai_analysis_document"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_document_ai_analysis_owner_id_status"
        `);
    await queryRunner.query(`
            DROP TABLE "document_ai_analysis"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."document_analysis_status"
        `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

// Documents and their links to projects, tasks and goals.
//
// Hand-written addition: IDX_documents_search, a GIN expression index for
// full-text search. TypeORM can't model expression indexes; the entity declares
// it with `synchronize: false` so generated migrations leave it alone. The
// expression must stay identical to `searchVectorSql()` in document.entity.ts.

export class AddDocuments1791178355187 implements MigrationInterface {
  name = 'AddDocuments1791178355187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."document_source_type" AS ENUM('MANUAL', 'UPLOAD', 'IMPORT', 'URL')
        `);
    await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "title" character varying(300) NOT NULL,
                "content" text NOT NULL,
                "mime_type" character varying(255) NOT NULL,
                "source_type" "public"."document_source_type" NOT NULL,
                "source_url" character varying(2048),
                "file_name" character varying(255),
                "file_size_bytes" bigint,
                "checksum" character varying(128),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_documents_id_owner_id" UNIQUE ("id", "owner_id"),
                CONSTRAINT "CHK_documents_file_size_bytes" CHECK ("file_size_bytes" >= 0),
                CONSTRAINT "PK_documents" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_documents_owner_id_source_type" ON "documents" ("owner_id", "source_type")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_documents_owner_id_created_at" ON "documents" ("owner_id", "created_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_documents_search" ON "documents"
            USING GIN (to_tsvector('english', "title" || ' ' || "content"))
        `);
    await queryRunner.query(`
            CREATE TABLE "document_goals" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "document_id" uuid NOT NULL,
                "goal_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_document_goals_document_id_goal_id" UNIQUE ("document_id", "goal_id"),
                CONSTRAINT "PK_document_goals" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_document_goals_goal_id" ON "document_goals" ("goal_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "document_projects" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "document_id" uuid NOT NULL,
                "project_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_document_projects_document_id_project_id" UNIQUE ("document_id", "project_id"),
                CONSTRAINT "PK_document_projects" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_document_projects_project_id" ON "document_projects" ("project_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "document_tasks" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "document_id" uuid NOT NULL,
                "task_id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_document_tasks_document_id_task_id" UNIQUE ("document_id", "task_id"),
                CONSTRAINT "PK_document_tasks" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_document_tasks_task_id" ON "document_tasks" ("task_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "goals"
            ADD CONSTRAINT "UQ_goals_id_owner_id" UNIQUE ("id", "owner_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "UQ_tasks_id_owner_id" UNIQUE ("id", "owner_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "documents"
            ADD CONSTRAINT "FK_documents_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_goals"
            ADD CONSTRAINT "FK_document_goals_document" FOREIGN KEY ("document_id", "owner_id") REFERENCES "documents"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_goals"
            ADD CONSTRAINT "FK_document_goals_goal" FOREIGN KEY ("goal_id", "owner_id") REFERENCES "goals"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_projects"
            ADD CONSTRAINT "FK_document_projects_document" FOREIGN KEY ("document_id", "owner_id") REFERENCES "documents"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_projects"
            ADD CONSTRAINT "FK_document_projects_project" FOREIGN KEY ("project_id", "owner_id") REFERENCES "projects"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_tasks"
            ADD CONSTRAINT "FK_document_tasks_document" FOREIGN KEY ("document_id", "owner_id") REFERENCES "documents"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "document_tasks"
            ADD CONSTRAINT "FK_document_tasks_task" FOREIGN KEY ("task_id", "owner_id") REFERENCES "tasks"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "document_tasks" DROP CONSTRAINT "FK_document_tasks_task"
        `);
    await queryRunner.query(`
            ALTER TABLE "document_tasks" DROP CONSTRAINT "FK_document_tasks_document"
        `);
    await queryRunner.query(`
            ALTER TABLE "document_projects" DROP CONSTRAINT "FK_document_projects_project"
        `);
    await queryRunner.query(`
            ALTER TABLE "document_projects" DROP CONSTRAINT "FK_document_projects_document"
        `);
    await queryRunner.query(`
            ALTER TABLE "document_goals" DROP CONSTRAINT "FK_document_goals_goal"
        `);
    await queryRunner.query(`
            ALTER TABLE "document_goals" DROP CONSTRAINT "FK_document_goals_document"
        `);
    await queryRunner.query(`
            ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "UQ_tasks_id_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "goals" DROP CONSTRAINT "UQ_goals_id_owner_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_document_tasks_task_id"
        `);
    await queryRunner.query(`
            DROP TABLE "document_tasks"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_document_projects_project_id"
        `);
    await queryRunner.query(`
            DROP TABLE "document_projects"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_document_goals_goal_id"
        `);
    await queryRunner.query(`
            DROP TABLE "document_goals"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_documents_search"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_documents_owner_id_created_at"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_documents_owner_id_source_type"
        `);
    await queryRunner.query(`
            DROP TABLE "documents"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."document_source_type"
        `);
  }
}

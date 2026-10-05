import { MigrationInterface, QueryRunner } from 'typeorm';

// Projects, tasks and goals — all owned by a user (ON DELETE CASCADE).
//
// Hand-edited (generated otherwise): FK_tasks_project_id_owner_id uses
// `ON DELETE SET NULL ("project_id")` (PostgreSQL 15+). The composite key makes
// a task → another user's project link impossible; the column list makes a
// project delete null only project_id. Without it, PostgreSQL would also null
// the NOT NULL owner_id and the delete would fail. TypeORM can't express the
// column list, but it reads the rule back as plain SET NULL, so no drift.

export class AddProjectsTasksGoals1791177007154 implements MigrationInterface {
  name = 'AddProjectsTasksGoals1791177007154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED')
        `);
    await queryRunner.query(`
            CREATE TABLE "goals" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "title" character varying(200) NOT NULL,
                "description" text,
                "status" "public"."goal_status" NOT NULL DEFAULT 'ACTIVE',
                "target_date" date,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_goals" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_goals_owner_id_status" ON "goals" ("owner_id", "status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."project_status" AS ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED')
        `);
    await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "name" character varying(200) NOT NULL,
                "description" text,
                "status" "public"."project_status" NOT NULL DEFAULT 'ACTIVE',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_projects_id_owner_id" UNIQUE ("id", "owner_id"),
                CONSTRAINT "PK_projects" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_projects_owner_id_status" ON "projects" ("owner_id", "status")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')
        `);
    await queryRunner.query(`
            CREATE TABLE "tasks" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "project_id" uuid,
                "title" character varying(200) NOT NULL,
                "description" text,
                "status" "public"."task_status" NOT NULL DEFAULT 'TODO',
                "priority" "public"."task_priority" NOT NULL DEFAULT 'MEDIUM',
                "due_at" TIMESTAMP WITH TIME ZONE,
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_tasks_completed_at" CHECK (
                    ("status" = 'COMPLETED') = ("completed_at" IS NOT NULL)
                ),
                CONSTRAINT "PK_tasks" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_tasks_project_id" ON "tasks" ("project_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_tasks_owner_id_due_at" ON "tasks" ("owner_id", "due_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_tasks_owner_id_status" ON "tasks" ("owner_id", "status")
        `);
    await queryRunner.query(`
            ALTER TABLE "goals"
            ADD CONSTRAINT "FK_goals_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "projects"
            ADD CONSTRAINT "FK_projects_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_tasks_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "tasks"
            ADD CONSTRAINT "FK_tasks_project_id_owner_id" FOREIGN KEY ("project_id", "owner_id") REFERENCES "projects"("id", "owner_id") ON DELETE
            SET NULL ("project_id") ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_project_id_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "goals" DROP CONSTRAINT "FK_goals_owner_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_tasks_owner_id_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_tasks_owner_id_due_at"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_tasks_project_id"
        `);
    await queryRunner.query(`
            DROP TABLE "tasks"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."task_priority"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."task_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_projects_owner_id_status"
        `);
    await queryRunner.query(`
            DROP TABLE "projects"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."project_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_goals_owner_id_status"
        `);
    await queryRunner.query(`
            DROP TABLE "goals"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."goal_status"
        `);
  }
}

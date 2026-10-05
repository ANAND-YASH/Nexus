import { MigrationInterface, QueryRunner } from 'typeorm';

/** Resource tables whose deletion must remove their graph edges. */
const RESOURCE_TABLES = [
  ['documents', 'DOCUMENT'],
  ['projects', 'PROJECT'],
  ['tasks', 'TASK'],
  ['goals', 'GOAL'],
  ['context_entities', 'ENTITY'],
] as const;

// Context graph: context_entities and context_relationships.
//
// Hand-written addition (TypeORM doesn't model triggers, so they don't cause
// drift): relationship endpoints are polymorphic, so PostgreSQL can't put a
// foreign key on source_id/target_id. Instead an AFTER DELETE trigger on each
// resource table deletes that resource's relationships, owner-scoped (which
// lets it use the owner-leading indexes). Together with the owner-scoped
// FOR KEY SHARE locks taken when a relationship is created, no relationship
// can point at a deleted resource.

export class AddContextGraph1791184080111 implements MigrationInterface {
  name = 'AddContextGraph1791184080111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."context_entity_type" AS ENUM(
                'PERSON',
                'ORGANIZATION',
                'PROJECT',
                'TECHNOLOGY',
                'LOCATION',
                'CONCEPT'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "context_entities" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "name" character varying(200) NOT NULL,
                "normalized_name" character varying(200) NOT NULL,
                "type" "public"."context_entity_type" NOT NULL,
                "description" text,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_context_entities_owner_id_type_normalized_name" UNIQUE ("owner_id", "type", "normalized_name"),
                CONSTRAINT "PK_context_entities" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_context_entities_owner_id_normalized_name" ON "context_entities" ("owner_id", "normalized_name")
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."context_resource_type" AS ENUM('DOCUMENT', 'PROJECT', 'TASK', 'GOAL', 'ENTITY')
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."context_relationship_type" AS ENUM(
                'RELATED_TO',
                'MENTIONS',
                'SUPPORTS',
                'DEPENDS_ON',
                'BLOCKS',
                'PART_OF',
                'ASSIGNED_TO',
                'CREATED_BY',
                'USES'
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."context_relationship_source" AS ENUM('USER', 'AI', 'SYSTEM', 'IMPORT')
        `);
    await queryRunner.query(`
            CREATE TABLE "context_relationships" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "owner_id" uuid NOT NULL,
                "source_type" "public"."context_resource_type" NOT NULL,
                "source_id" uuid NOT NULL,
                "relationship_type" "public"."context_relationship_type" NOT NULL,
                "target_type" "public"."context_resource_type" NOT NULL,
                "target_id" uuid NOT NULL,
                "confidence" numeric(4, 3) NOT NULL,
                "source" "public"."context_relationship_source" NOT NULL,
                "source_document_id" uuid,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_context_relationships_edge" UNIQUE (
                    "owner_id",
                    "source_type",
                    "source_id",
                    "relationship_type",
                    "target_type",
                    "target_id"
                ),
                CONSTRAINT "CHK_context_relationships_not_self" CHECK (
                    NOT (
                        "source_type" = "target_type"
                        AND "source_id" = "target_id"
                    )
                ),
                CONSTRAINT "CHK_context_relationships_ai_provenance" CHECK (
                    "source" <> 'AI'
                    OR "source_document_id" IS NOT NULL
                ),
                CONSTRAINT "CHK_context_relationships_user_confidence" CHECK (
                    "source" <> 'USER'
                    OR "confidence" = 1
                ),
                CONSTRAINT "CHK_context_relationships_confidence" CHECK (
                    "confidence" >= 0
                    AND "confidence" <= 1
                ),
                CONSTRAINT "PK_context_relationships" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_context_relationships_source_document_id" ON "context_relationships" ("source_document_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_context_relationships_owner_id_relationship_type" ON "context_relationships" ("owner_id", "relationship_type")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_context_relationships_owner_id_target" ON "context_relationships" ("owner_id", "target_type", "target_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "context_entities"
            ADD CONSTRAINT "FK_context_entities_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "context_relationships"
            ADD CONSTRAINT "FK_context_relationships_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "context_relationships"
            ADD CONSTRAINT "FK_context_relationships_source_document" FOREIGN KEY ("source_document_id", "owner_id") REFERENCES "documents"("id", "owner_id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE FUNCTION "delete_context_relationships"() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
              DELETE FROM "context_relationships"
              WHERE "owner_id" = OLD."owner_id"
                AND (
                  ("source_type" = TG_ARGV[0]::"context_resource_type" AND "source_id" = OLD."id")
                  OR ("target_type" = TG_ARGV[0]::"context_resource_type" AND "target_id" = OLD."id")
                );
              RETURN OLD;
            END
            $$
        `);
    for (const [table, type] of RESOURCE_TABLES) {
      await queryRunner.query(`
            CREATE TRIGGER "TRG_${table}_delete_context_relationships"
            AFTER DELETE ON "${table}"
            FOR EACH ROW EXECUTE FUNCTION "delete_context_relationships"('${type}')
        `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table] of RESOURCE_TABLES) {
      await queryRunner.query(`
            DROP TRIGGER "TRG_${table}_delete_context_relationships" ON "${table}"
        `);
    }
    await queryRunner.query(`
            DROP FUNCTION "delete_context_relationships"()
        `);
    await queryRunner.query(`
            ALTER TABLE "context_relationships" DROP CONSTRAINT "FK_context_relationships_source_document"
        `);
    await queryRunner.query(`
            ALTER TABLE "context_relationships" DROP CONSTRAINT "FK_context_relationships_owner_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "context_entities" DROP CONSTRAINT "FK_context_entities_owner_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_context_relationships_owner_id_target"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_context_relationships_owner_id_relationship_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_context_relationships_source_document_id"
        `);
    await queryRunner.query(`
            DROP TABLE "context_relationships"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."context_relationship_source"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."context_relationship_type"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."context_resource_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_context_entities_owner_id_normalized_name"
        `);
    await queryRunner.query(`
            DROP TABLE "context_entities"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."context_entity_type"
        `);
  }
}

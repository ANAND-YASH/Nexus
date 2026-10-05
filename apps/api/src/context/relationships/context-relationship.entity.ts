import {
  ContextResourceType,
  RelationshipSource,
  RelationshipType,
} from '@nexus/types';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Document } from '../../documents/document.entity';
import { User } from '../../users/user.entity';

/** numeric ↔ number (pg returns numeric as a string). */
const numericToNumber = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

/**
 * A directed, typed edge between two of a user's resources.
 *
 * `source_id`/`target_id` are polymorphic (they point into documents,
 * projects, tasks, goals or context_entities), so PostgreSQL can't hold a
 * foreign key for them. Instead:
 *  - creation locks both endpoints (owner-scoped `FOR KEY SHARE`) in the same
 *    transaction as the insert, so they exist and are the owner's;
 *  - AFTER DELETE triggers on the five resource tables delete their edges
 *    (see the AddContextGraph migration), so no edge outlives its endpoint.
 *
 * The unique edge key's index also serves (owner_id, source_type, source_id)
 * lookups, so no separate index is needed for them.
 */
@Entity({ name: 'context_relationships' })
@Unique('UQ_context_relationships_edge', [
  'ownerId',
  'sourceType',
  'sourceId',
  'relationshipType',
  'targetType',
  'targetId',
])
@Index('IDX_context_relationships_owner_id_target', [
  'ownerId',
  'targetType',
  'targetId',
])
@Index('IDX_context_relationships_owner_id_relationship_type', [
  'ownerId',
  'relationshipType',
])
@Check(
  'CHK_context_relationships_confidence',
  `"confidence" >= 0 AND "confidence" <= 1`,
)
@Check(
  'CHK_context_relationships_user_confidence',
  `"source" <> 'USER' OR "confidence" = 1`,
)
@Check(
  'CHK_context_relationships_ai_provenance',
  `"source" <> 'AI' OR "source_document_id" IS NOT NULL`,
)
@Check(
  'CHK_context_relationships_not_self',
  `NOT ("source_type" = "target_type" AND "source_id" = "target_id")`,
)
export class ContextRelationship {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_context_relationships',
  })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_context_relationships_owner_id',
  })
  owner?: User;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: Object.values(ContextResourceType),
    enumName: 'context_resource_type',
  })
  sourceType: ContextResourceType;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId: string;

  @Column({
    name: 'relationship_type',
    type: 'enum',
    enum: Object.values(RelationshipType),
    enumName: 'context_relationship_type',
  })
  relationshipType: RelationshipType;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: Object.values(ContextResourceType),
    enumName: 'context_resource_type',
  })
  targetType: ContextResourceType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 3,
    transformer: numericToNumber,
  })
  confidence: number;

  @Column({
    type: 'enum',
    enum: Object.values(RelationshipSource),
    enumName: 'context_relationship_source',
  })
  source: RelationshipSource;

  @Index('IDX_context_relationships_source_document_id')
  @Column({ name: 'source_document_id', type: 'uuid', nullable: true })
  sourceDocumentId: string | null;

  /**
   * Provenance document; composite FK so it must be the owner's. Deleting
   * the document deletes the relationships it justified.
   */
  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'source_document_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_context_relationships_source_document',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_context_relationships_source_document',
    },
  ])
  sourceDocument?: Document | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

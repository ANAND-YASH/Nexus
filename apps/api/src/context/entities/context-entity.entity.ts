import { ContextEntityType } from '@nexus/types';
import {
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
import { User } from '../../users/user.entity';

/**
 * A named thing in a user's world (person, organization, technology…).
 * One row per (owner, type, normalized name): "Acme" the organization and
 * "Acme" the project are different entities; "ACME" and "acme" are not.
 */
@Entity({ name: 'context_entities' })
@Unique('UQ_context_entities_owner_id_type_normalized_name', [
  'ownerId',
  'type',
  'normalizedName',
])
@Index('IDX_context_entities_owner_id_normalized_name', [
  'ownerId',
  'normalizedName',
])
export class ContextEntity {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_context_entities',
  })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_context_entities_owner_id',
  })
  owner?: User;

  /** Display name as entered (whitespace-cleaned). */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** normalizeEntityName(name) — the lookup/de-duplication key. */
  @Column({ name: 'normalized_name', type: 'varchar', length: 200 })
  normalizedName: string;

  @Column({
    type: 'enum',
    enum: Object.values(ContextEntityType),
    enumName: 'context_entity_type',
  })
  type: ContextEntityType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

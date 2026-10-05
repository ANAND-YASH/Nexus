import { DocumentSourceType } from '@nexus/types';
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
import { User } from '../users/user.entity';

/**
 * Text search configuration and expression. Must match the GIN index created
 * in the AddDocuments migration exactly, or PostgreSQL won't use the index.
 */
export const SEARCH_CONFIG = 'english';
export const searchVectorSql = (alias: string) =>
  `to_tsvector('${SEARCH_CONFIG}', ${alias}."title" || ' ' || ${alias}."content")`;

/** bigint ↔ number (file sizes stay far below 2^53). */
const bigintToNumber = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity({ name: 'documents' })
// Target of the composite (document_id, owner_id) keys in document_* links.
@Unique('UQ_documents_id_owner_id', ['id', 'ownerId'])
@Index('IDX_documents_owner_id_created_at', ['ownerId', 'createdAt'])
@Index('IDX_documents_owner_id_source_type', ['ownerId', 'sourceType'])
// GIN expression index for full-text search. TypeORM can't model expression
// indexes, so it is created by hand in the migration; `synchronize: false`
// stops TypeORM from dropping it when generating future migrations.
@Index('IDX_documents_search', { synchronize: false })
@Check('CHK_documents_file_size_bytes', `"file_size_bytes" >= 0`)
export class Document {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_documents' })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_documents_owner_id',
  })
  owner?: User;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  /** Raw text. Never logged or echoed in errors. */
  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: Object.values(DocumentSourceType),
    enumName: 'document_source_type',
  })
  sourceType: DocumentSourceType;

  @Column({ name: 'source_url', type: 'varchar', length: 2048, nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({
    name: 'file_size_bytes',
    type: 'bigint',
    nullable: true,
    transformer: bigintToNumber,
  })
  fileSizeBytes: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

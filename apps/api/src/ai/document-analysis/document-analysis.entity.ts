import {
  type AnalysisActionItem,
  type AnalysisEntity,
  type AnalysisImportantDate,
  DocumentAnalysisStatus,
} from '@nexus/types';
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
import { Document } from '../../documents/document.entity';

/**
 * The current AI analysis of one document (one row per document). Each
 * (re-)analysis starts a new run (`run_id`); a job only writes results while
 * its run is still current, so duplicate or superseded jobs are harmless.
 */
@Entity({ name: 'document_ai_analysis' })
@Unique('UQ_document_ai_analysis_document_id_owner_id', [
  'documentId',
  'ownerId',
])
@Index('IDX_document_ai_analysis_owner_id_status', ['ownerId', 'status'])
export class DocumentAnalysis {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_document_ai_analysis',
  })
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  /** Composite FK: the analysis owner must be the document owner. */
  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'document_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_ai_analysis_document',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_ai_analysis_document',
    },
  ])
  document?: Document;

  @Column({
    type: 'enum',
    enum: Object.values(DocumentAnalysisStatus),
    enumName: 'document_analysis_status',
    default: DocumentAnalysisStatus.PENDING,
  })
  status: DocumentAnalysisStatus;

  /** Identifies the current run; internal, never returned by the API. */
  @Column({ name: 'run_id', type: 'uuid' })
  runId: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'key_points', type: 'jsonb', nullable: true })
  keyPoints: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  topics: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  entities: AnalysisEntity[] | null;

  @Column({ name: 'action_items', type: 'jsonb', nullable: true })
  actionItems: AnalysisActionItem[] | null;

  @Column({ name: 'important_dates', type: 'jsonb', nullable: true })
  importantDates: AnalysisImportantDate[] | null;

  /** Safe, user-facing failure message. Never a raw provider error. */
  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

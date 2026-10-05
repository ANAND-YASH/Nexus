import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/project.entity';
import { Document } from '../document.entity';

/**
 * Document ↔ project link. Both sides are composite (id, owner_id) foreign
 * keys sharing one owner_id column, so a link between two different users'
 * records cannot exist. Deleting either side deletes the link only.
 */
@Entity({ name: 'document_projects' })
@Unique('UQ_document_projects_document_id_project_id', [
  'documentId',
  'projectId',
])
export class DocumentProjectLink {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_document_projects',
  })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Index('IDX_document_projects_project_id')
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'document_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_projects_document',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_projects_document',
    },
  ])
  document?: Document;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'project_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_projects_project',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_projects_project',
    },
  ])
  project?: Project;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

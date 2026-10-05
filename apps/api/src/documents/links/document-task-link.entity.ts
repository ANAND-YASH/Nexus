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
import { Task } from '../../tasks/task.entity';
import { Document } from '../document.entity';

/**
 * Document ↔ task link. Both sides are composite (id, owner_id) foreign
 * keys sharing one owner_id column, so a link between two different users'
 * records cannot exist. Deleting either side deletes the link only.
 */
@Entity({ name: 'document_tasks' })
@Unique('UQ_document_tasks_document_id_task_id', ['documentId', 'taskId'])
export class DocumentTaskLink {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_document_tasks',
  })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Index('IDX_document_tasks_task_id')
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'document_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_tasks_document',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_tasks_document',
    },
  ])
  document?: Document;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'task_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_tasks_task',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_tasks_task',
    },
  ])
  task?: Task;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

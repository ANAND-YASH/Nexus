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
import { Goal } from '../../goals/goal.entity';
import { Document } from '../document.entity';

/**
 * Document ↔ goal link. Both sides are composite (id, owner_id) foreign
 * keys sharing one owner_id column, so a link between two different users'
 * records cannot exist. Deleting either side deletes the link only.
 */
@Entity({ name: 'document_goals' })
@Unique('UQ_document_goals_document_id_goal_id', ['documentId', 'goalId'])
export class DocumentGoalLink {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_document_goals',
  })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Index('IDX_document_goals_goal_id')
  @Column({ name: 'goal_id', type: 'uuid' })
  goalId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'document_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_goals_document',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_goals_document',
    },
  ])
  document?: Document;

  @ManyToOne(() => Goal, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn([
    {
      name: 'goal_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_document_goals_goal',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_document_goals_goal',
    },
  ])
  goal?: Goal;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

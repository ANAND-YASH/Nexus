import { TaskPriority, TaskStatus } from '@nexus/types';
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
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'tasks' })
// Target of composite (task_id, owner_id) keys, e.g. document_tasks.
@Unique('UQ_tasks_id_owner_id', ['id', 'ownerId'])
@Index('IDX_tasks_owner_id_status', ['ownerId', 'status'])
@Index('IDX_tasks_owner_id_due_at', ['ownerId', 'dueAt'])
// completedAt is server-managed; the database refuses inconsistent rows too.
@Check(
  'CHK_tasks_completed_at',
  `("status" = 'COMPLETED') = ("completed_at" IS NOT NULL)`,
)
export class Task {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_tasks' })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_tasks_owner_id',
  })
  owner?: User;

  @Index('IDX_tasks_project_id')
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  /**
   * Composite FK (project_id, owner_id) → projects (id, owner_id): a task can
   * only reference a project with the same owner. On project delete only
   * project_id is nulled — see the AddProjectsTasksGoals migration, which
   * uses PostgreSQL's `ON DELETE SET NULL (project_id)` column list.
   */
  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn([
    {
      name: 'project_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_tasks_project_id_owner_id',
    },
    {
      name: 'owner_id',
      referencedColumnName: 'ownerId',
      foreignKeyConstraintName: 'FK_tasks_project_id_owner_id',
    },
  ])
  project?: Project | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: Object.values(TaskStatus),
    enumName: 'task_status',
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: Object.values(TaskPriority),
    enumName: 'task_priority',
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

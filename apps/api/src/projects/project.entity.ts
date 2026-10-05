import { ProjectStatus } from '@nexus/types';
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
import { User } from '../users/user.entity';

@Entity({ name: 'projects' })
// Target of the tasks' composite (project_id, owner_id) foreign key, which
// makes cross-user task → project links impossible at the database level.
@Unique('UQ_projects_id_owner_id', ['id', 'ownerId'])
@Index('IDX_projects_owner_id_status', ['ownerId', 'status'])
export class Project {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_projects' })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_projects_owner_id',
  })
  owner?: User;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: Object.values(ProjectStatus),
    enumName: 'project_status',
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

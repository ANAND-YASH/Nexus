import { GoalStatus } from '@nexus/types';
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

@Entity({ name: 'goals' })
// Target of composite (goal_id, owner_id) keys, e.g. document_goals.
@Unique('UQ_goals_id_owner_id', ['id', 'ownerId'])
@Index('IDX_goals_owner_id_status', ['ownerId', 'status'])
export class Goal {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_goals' })
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'owner_id',
    foreignKeyConstraintName: 'FK_goals_owner_id',
  })
  owner?: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: Object.values(GoalStatus),
    enumName: 'goal_status',
    default: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  /** Calendar date; TypeORM maps PostgreSQL `date` to a `YYYY-MM-DD` string. */
  @Column({ name: 'target_date', type: 'date', nullable: true })
  targetDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

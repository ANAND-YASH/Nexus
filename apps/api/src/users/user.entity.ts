import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// `user` is a reserved word in PostgreSQL, hence the plural table name.
@Entity({ name: 'users' })
@Unique('UQ_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_users' })
  id: string;

  /**
   * Stored normalized so the unique constraint is effectively
   * case-insensitive. The transformer also normalizes values in queries
   * (e.g. `findOneBy({ email })`).
   */
  // 320 = RFC 5321 maximum (64 local part + @ + 255 domain).
  @Column({
    type: 'varchar',
    length: 320,
    transformer: {
      to: (value: unknown) =>
        typeof value === 'string' ? normalizeEmail(value) : value,
      from: (value: string) => value,
    },
  })
  email: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Keeps the in-memory entity consistent with what is persisted. */
  @BeforeInsert()
  @BeforeUpdate()
  protected normalize(): void {
    if (typeof this.email === 'string') this.email = normalizeEmail(this.email);
  }
}

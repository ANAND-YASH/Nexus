import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { normalizeEmail, User } from './user.entity';

const UNIQUE_VIOLATION = '23505';
const EMAIL_UNIQUE_CONSTRAINT = 'UQ_users_email';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /** Includes `passwordHash`; for credential verification only. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  /** @throws ConflictException if the email is already registered. */
  async create(email: string, passwordHash: string): Promise<User> {
    try {
      const user = await this.users.save(
        this.users.create({ email, passwordHash }),
      );
      // Don't carry the hash around on the returned object.
      return Object.assign(user, { passwordHash: undefined });
    } catch (error) {
      // The constraint is the source of truth (no check-then-insert race).
      if (isUniqueViolation(error, EMAIL_UNIQUE_CONSTRAINT)) {
        throw new ConflictException('Email is already registered.');
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === UNIQUE_VIOLATION &&
    driverError.constraint === constraint
  );
}

import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import type { User } from './user.entity';
import { UsersService } from './users.service';

function queryError(code: string, constraint?: string) {
  return new QueryFailedError('INSERT ...', [], {
    code,
    constraint,
  } as unknown as Error);
}

describe('UsersService.create', () => {
  const save = jest.fn();
  const repo = {
    create: (v: Partial<User>) => v,
    save,
  } as unknown as Repository<User>;
  const service = new UsersService(repo);

  beforeEach(() => save.mockReset());

  it('maps the email unique violation to 409 Conflict', async () => {
    save.mockRejectedValue(queryError('23505', 'UQ_users_email'));

    await expect(service.create('a@example.com', 'hash')).rejects.toThrow(
      ConflictException,
    );
  });

  it('does not mask unrelated database errors', async () => {
    const other = queryError('23505', 'some_other_constraint');
    save.mockRejectedValue(other);

    await expect(service.create('a@example.com', 'hash')).rejects.toBe(other);
  });

  it('does not return the password hash', async () => {
    save.mockImplementation((u: Partial<User>) =>
      Promise.resolve({ id: '1', ...u }),
    );

    const user = await service.create('a@example.com', 'hash');

    expect(user.passwordHash).toBeUndefined();
  });
});

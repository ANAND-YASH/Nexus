import { NotFoundException } from '@nestjs/common';
import { GoalStatus } from '@nexus/types';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { Goal } from './goal.entity';
import { GoalsService } from './goals.service';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BOB = '00000000-0000-4000-8000-00000000000b';

describe('GoalsService', () => {
  let repo: InMemoryRepository<Goal>;
  let service: GoalsService;

  beforeEach(() => {
    repo = new InMemoryRepository<Goal>();
    service = new GoalsService(repo.asRepository());
  });

  const bobsGoal = () =>
    repo.seed({
      ownerId: BOB,
      title: "Bob's goal",
      description: null,
      status: GoalStatus.ACTIVE,
      targetDate: null,
    });

  it('creates a goal owned by the caller with defaults', async () => {
    const goal = await service.create(ALICE, {
      title: 'Run a marathon',
      targetDate: '2027-04-18',
    });

    expect(goal).toEqual({
      id: expect.any(String),
      title: 'Run a marathon',
      description: null,
      status: 'ACTIVE',
      targetDate: '2027-04-18',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(repo.rows[0]!.ownerId).toBe(ALICE);
  });

  it("lists only the caller's goals and filters by status", async () => {
    await service.create(ALICE, { title: 'A' });
    await service.create(ALICE, { title: 'B', status: GoalStatus.PAUSED });
    bobsGoal();

    expect((await service.list(ALICE, {})).map((g) => g.title)).toEqual([
      'B',
      'A',
    ]);
    expect(
      (await service.list(ALICE, { status: GoalStatus.PAUSED })).map(
        (g) => g.title,
      ),
    ).toEqual(['B']);
  });

  it('gets an own goal', async () => {
    const { id } = await service.create(ALICE, { title: 'Mine' });
    await expect(service.get(ALICE, id)).resolves.toMatchObject({ id });
  });

  it("cannot read, update or delete another user's goal", async () => {
    const { id } = bobsGoal();

    await expect(service.get(ALICE, id)).rejects.toThrow(NotFoundException);
    await expect(
      service.update(ALICE, id, { title: 'Hijacked' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.remove(ALICE, id)).rejects.toThrow(NotFoundException);
    expect(repo.rows).toEqual([
      expect.objectContaining({ title: "Bob's goal" }),
    ]);
  });

  it('updates provided fields and clears targetDate with null', async () => {
    const { id } = await service.create(ALICE, {
      title: 'Old',
      targetDate: '2027-01-01',
    });

    const updated = await service.update(ALICE, id, {
      status: GoalStatus.COMPLETED,
      targetDate: null,
    });

    expect(updated).toMatchObject({
      title: 'Old',
      status: 'COMPLETED',
      targetDate: null,
    });
  });

  it('deletes an own goal', async () => {
    const { id } = await service.create(ALICE, { title: 'Bye' });
    await service.remove(ALICE, id);
    expect(repo.rows).toHaveLength(0);
  });
});

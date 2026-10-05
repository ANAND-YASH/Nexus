import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GoalStatus, type GoalResponse } from '@nexus/types';
import { Repository } from 'typeorm';
import { definedOnly } from '../common/validation';
import type {
  CreateGoalDto,
  ListGoalsQueryDto,
  UpdateGoalDto,
} from './dto/goal.dto';
import { Goal } from './goal.entity';
import { toGoalResponse } from './goal.mapper';

/** Every query is scoped by `ownerId`; foreign goals look missing (404). */
@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal) private readonly goals: Repository<Goal>,
  ) {}

  async create(ownerId: string, dto: CreateGoalDto): Promise<GoalResponse> {
    const goal = await this.goals.save(
      this.goals.create({
        ownerId,
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? GoalStatus.ACTIVE,
        targetDate: dto.targetDate ?? null,
      }),
    );
    return toGoalResponse(goal);
  }

  async list(
    ownerId: string,
    query: ListGoalsQueryDto,
  ): Promise<GoalResponse[]> {
    const goals = await this.goals.find({
      where: { ownerId, ...definedOnly({ status: query.status }) },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return goals.map(toGoalResponse);
  }

  async get(ownerId: string, id: string): Promise<GoalResponse> {
    return toGoalResponse(await this.findOwned(ownerId, id));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateGoalDto,
  ): Promise<GoalResponse> {
    const goal = await this.findOwned(ownerId, id);
    Object.assign(goal, definedOnly(dto));
    return toGoalResponse(await this.goals.save(goal));
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.goals.delete({ id, ownerId });
    if (!result.affected) throw goalNotFound();
  }

  /** @throws NotFoundException unless the goal exists and is the owner's. */
  async assertOwned(ownerId: string, id: string): Promise<void> {
    if (!(await this.goals.exists({ where: { id, ownerId } }))) {
      throw goalNotFound();
    }
  }

  private async findOwned(ownerId: string, id: string): Promise<Goal> {
    const goal = await this.goals.findOne({ where: { id, ownerId } });
    if (!goal) throw goalNotFound();
    return goal;
  }
}

export const goalNotFound = () => new NotFoundException('Goal not found.');

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskPriority, TaskStatus, type TaskResponse } from '@nexus/types';
import { Repository } from 'typeorm';
import { isForeignKeyViolation } from '../common/errors';
import { definedOnly } from '../common/validation';
import { projectNotFound, ProjectsService } from '../projects/projects.service';
import type {
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { Task } from './task.entity';
import { toTaskResponse } from './task.mapper';

const PROJECT_OWNER_FK = 'FK_tasks_project_id_owner_id';

/**
 * Every query is scoped by `ownerId`; foreign tasks look missing (404).
 * A task's project must belong to the same owner — checked here (clear 404)
 * and enforced again by a composite foreign key in the database.
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly projects: ProjectsService,
  ) {}

  async create(ownerId: string, dto: CreateTaskDto): Promise<TaskResponse> {
    if (dto.projectId) await this.projects.assertOwned(ownerId, dto.projectId);

    const status = dto.status ?? TaskStatus.TODO;
    const task = this.tasks.create({
      ownerId,
      projectId: dto.projectId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      status,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      dueAt: toDate(dto.dueAt),
      completedAt: status === TaskStatus.COMPLETED ? new Date() : null,
    });
    return toTaskResponse(await this.save(task));
  }

  async list(
    ownerId: string,
    query: ListTasksQueryDto,
  ): Promise<TaskResponse[]> {
    const tasks = await this.tasks.find({
      where: {
        ownerId,
        ...definedOnly({
          status: query.status,
          priority: query.priority,
          projectId: query.projectId,
        }),
      },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return tasks.map(toTaskResponse);
  }

  async get(ownerId: string, id: string): Promise<TaskResponse> {
    return toTaskResponse(await this.findOwned(ownerId, id));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    const task = await this.findOwned(ownerId, id);
    const { dueAt, status, ...rest } = definedOnly(dto);

    if (rest.projectId && rest.projectId !== task.projectId) {
      await this.projects.assertOwned(ownerId, rest.projectId);
    }
    Object.assign(task, rest);
    if (dueAt !== undefined) task.dueAt = toDate(dueAt);
    if (status !== undefined) applyStatus(task, status);

    return toTaskResponse(await this.save(task));
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.tasks.delete({ id, ownerId });
    if (!result.affected) throw taskNotFound();
  }

  private async findOwned(ownerId: string, id: string): Promise<Task> {
    const task = await this.tasks.findOne({ where: { id, ownerId } });
    if (!task) throw taskNotFound();
    return task;
  }

  private async save(task: Task): Promise<Task> {
    try {
      return await this.tasks.save(task);
    } catch (error) {
      // The project was deleted between the ownership check and the write.
      if (isForeignKeyViolation(error, PROJECT_OWNER_FK)) {
        throw projectNotFound();
      }
      throw error;
    }
  }
}

/**
 * completedAt is server-managed: stamped on the transition into COMPLETED,
 * kept while it stays COMPLETED, cleared when the task is reopened.
 */
export function applyStatus(task: Task, next: TaskStatus): void {
  const wasCompleted = task.status === TaskStatus.COMPLETED;
  const isCompleted = next === TaskStatus.COMPLETED;
  if (isCompleted && !wasCompleted) task.completedAt = new Date();
  if (!isCompleted) task.completedAt = null;
  task.status = next;
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

const taskNotFound = () => new NotFoundException('Task not found.');

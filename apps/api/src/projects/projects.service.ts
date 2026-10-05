import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectStatus, type ProjectResponse } from '@nexus/types';
import { Repository } from 'typeorm';
import { definedOnly } from '../common/validation';
import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { Project } from './project.entity';
import { toProjectResponse } from './project.mapper';

/**
 * Every query is scoped by `ownerId`. Another user's project is
 * indistinguishable from a missing one (404), so existence never leaks.
 */
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
  ) {}

  async create(
    ownerId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.projects.save(
      this.projects.create({
        ownerId,
        name: dto.name,
        description: dto.description ?? null,
        status: dto.status ?? ProjectStatus.ACTIVE,
      }),
    );
    return toProjectResponse(project);
  }

  async list(
    ownerId: string,
    query: ListProjectsQueryDto,
  ): Promise<ProjectResponse[]> {
    const projects = await this.projects.find({
      where: { ownerId, ...definedOnly({ status: query.status }) },
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return projects.map(toProjectResponse);
  }

  async get(ownerId: string, id: string): Promise<ProjectResponse> {
    return toProjectResponse(await this.findOwned(ownerId, id));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.findOwned(ownerId, id);
    Object.assign(project, definedOnly(dto));
    return toProjectResponse(await this.projects.save(project));
  }

  /** Tasks in the project are kept; the database nulls their project_id. */
  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.projects.delete({ id, ownerId });
    if (!result.affected) throw projectNotFound();
  }

  /** @throws NotFoundException unless the project exists and is the owner's. */
  async assertOwned(ownerId: string, id: string): Promise<void> {
    if (!(await this.projects.exists({ where: { id, ownerId } }))) {
      throw projectNotFound();
    }
  }

  private async findOwned(ownerId: string, id: string): Promise<Project> {
    const project = await this.projects.findOne({ where: { id, ownerId } });
    if (!project) throw projectNotFound();
    return project;
  }
}

export const projectNotFound = () =>
  new NotFoundException('Project not found.');

import { Injectable } from '@nestjs/common';
import type { ContextResourceType } from '@nexus/types';
import { DocumentsService } from '../documents/documents.service';
import { GoalsService } from '../goals/goals.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { ContextEntitiesService } from './entities/context-entities.service';

interface Owned {
  assertOwned(ownerId: string, id: string): Promise<void>;
}

/**
 * Owner-scoped existence checks for any resource type, delegating to each
 * resource's own service (and its safe 404).
 */
@Injectable()
export class ResourceOwnershipService {
  private readonly services: Record<ContextResourceType, Owned>;

  constructor(
    documents: DocumentsService,
    projects: ProjectsService,
    tasks: TasksService,
    goals: GoalsService,
    entities: ContextEntitiesService,
  ) {
    this.services = {
      DOCUMENT: documents,
      PROJECT: projects,
      TASK: tasks,
      GOAL: goals,
      ENTITY: entities,
    };
  }

  /** @throws the resource's NotFoundException if missing or not the owner's. */
  assertOwned(
    ownerId: string,
    type: ContextResourceType,
    id: string,
  ): Promise<void> {
    return this.services[type].assertOwned(ownerId, id);
  }
}

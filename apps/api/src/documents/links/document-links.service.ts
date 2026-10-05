import { Injectable, NotFoundException } from '@nestjs/common';
import { isForeignKeyViolation } from '../../common/errors';
import { goalNotFound, GoalsService } from '../../goals/goals.service';
import {
  projectNotFound,
  ProjectsService,
} from '../../projects/projects.service';
import { taskNotFound, TasksService } from '../../tasks/tasks.service';
import { documentNotFound, DocumentsService } from '../documents.service';
import { DocumentLinksStore, type LinkKind } from './document-links.store';

/**
 * Links a document to one of the caller's projects, tasks or goals. Both
 * sides must belong to the caller; anything else is the same safe 404 as a
 * missing record. The database's composite keys enforce this again.
 */
@Injectable()
export class DocumentLinksService {
  constructor(
    private readonly documents: DocumentsService,
    private readonly projects: ProjectsService,
    private readonly tasks: TasksService,
    private readonly goals: GoalsService,
    private readonly store: DocumentLinksStore,
  ) {}

  /** Idempotent: linking twice keeps a single link. */
  async link(
    ownerId: string,
    documentId: string,
    kind: LinkKind,
    targetId: string,
  ): Promise<void> {
    await this.assertBothOwned(ownerId, documentId, kind, targetId);
    try {
      await this.store.link(kind, { ownerId, documentId, targetId });
    } catch (error) {
      // Either side was deleted between the ownership check and the insert.
      if (isForeignKeyViolation(error, `FK_document_${kind}s_document`)) {
        throw documentNotFound();
      }
      if (isForeignKeyViolation(error, `FK_document_${kind}s_${kind}`)) {
        throw TARGET_NOT_FOUND[kind]();
      }
      throw error;
    }
  }

  /** @throws NotFoundException if either side, or the link, doesn't exist. */
  async unlink(
    ownerId: string,
    documentId: string,
    kind: LinkKind,
    targetId: string,
  ): Promise<void> {
    await this.assertBothOwned(ownerId, documentId, kind, targetId);
    if (!(await this.store.unlink(kind, { ownerId, documentId, targetId }))) {
      throw new NotFoundException('Link not found.');
    }
  }

  private async assertBothOwned(
    ownerId: string,
    documentId: string,
    kind: LinkKind,
    targetId: string,
  ): Promise<void> {
    await this.documents.assertOwned(ownerId, documentId);
    const target = {
      project: this.projects,
      task: this.tasks,
      goal: this.goals,
    }[kind];
    await target.assertOwned(ownerId, targetId);
  }
}

const TARGET_NOT_FOUND = {
  project: projectNotFound,
  task: taskNotFound,
  goal: goalNotFound,
} as const;

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DocumentRelationshipsResponse } from '@nexus/types';
import { Repository } from 'typeorm';
import { DocumentGoalLink } from './document-goal-link.entity';
import { DocumentProjectLink } from './document-project-link.entity';
import { DocumentTaskLink } from './document-task-link.entity';

export type LinkKind = 'project' | 'task' | 'goal';

export interface LinkKey {
  ownerId: string;
  documentId: string;
  targetId: string;
}

/**
 * Data access for the three document_* join tables. Ownership checks live in
 * DocumentLinksService; the composite foreign keys enforce them again.
 */
@Injectable()
export class DocumentLinksStore {
  private readonly targetColumn = {
    project: 'projectId',
    task: 'taskId',
    goal: 'goalId',
  } as const;

  constructor(
    @InjectRepository(DocumentProjectLink)
    private readonly projectLinks: Repository<DocumentProjectLink>,
    @InjectRepository(DocumentTaskLink)
    private readonly taskLinks: Repository<DocumentTaskLink>,
    @InjectRepository(DocumentGoalLink)
    private readonly goalLinks: Repository<DocumentGoalLink>,
  ) {}

  /** Idempotent: an existing link is left as is (ON CONFLICT DO NOTHING). */
  async link(kind: LinkKind, key: LinkKey): Promise<void> {
    await this.repository(kind)
      .createQueryBuilder()
      .insert()
      .values({
        ownerId: key.ownerId,
        documentId: key.documentId,
        [this.targetColumn[kind]]: key.targetId,
      })
      .orIgnore()
      .execute();
  }

  /** @returns false if there was no such link. */
  async unlink(kind: LinkKind, key: LinkKey): Promise<boolean> {
    const result = await this.repository(kind).delete({
      ownerId: key.ownerId,
      documentId: key.documentId,
      [this.targetColumn[kind]]: key.targetId,
    });
    return (result.affected ?? 0) > 0;
  }

  async relationships(
    ownerId: string,
    documentId: string,
  ): Promise<DocumentRelationshipsResponse> {
    const where = { ownerId, documentId };
    const order = { createdAt: 'ASC' } as const;
    const [projects, tasks, goals] = await Promise.all([
      this.projectLinks.find({ where, order, select: { projectId: true } }),
      this.taskLinks.find({ where, order, select: { taskId: true } }),
      this.goalLinks.find({ where, order, select: { goalId: true } }),
    ]);
    return {
      projectIds: projects.map((l) => l.projectId),
      taskIds: tasks.map((l) => l.taskId),
      goalIds: goals.map((l) => l.goalId),
    };
  }

  private repository(
    kind: LinkKind,
  ): Repository<DocumentProjectLink | DocumentTaskLink | DocumentGoalLink> {
    return {
      project: this.projectLinks,
      task: this.taskLinks,
      goal: this.goalLinks,
    }[kind] as Repository<
      DocumentProjectLink | DocumentTaskLink | DocumentGoalLink
    >;
  }
}

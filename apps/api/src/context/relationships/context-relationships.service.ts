import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ContextRelationshipResponse,
  ContextResourceType,
} from '@nexus/types';
import { documentNotFound } from '../../documents/documents.service';
import { goalNotFound } from '../../goals/goals.service';
import { projectNotFound } from '../../projects/projects.service';
import { taskNotFound } from '../../tasks/tasks.service';
import { entityNotFound } from '../entities/context-entities.service';
import { toContextRelationshipResponse } from './context-relationship.mapper';
import {
  ContextRelationshipsStore,
  type RelationshipFilter,
} from './context-relationships.store';
import type { CreateContextRelationshipDto } from './dto/context-relationship.dto';
import {
  assertValidRelationship,
  type NewRelationship,
} from './relationship-rules';

/** The same safe 404 each resource's own endpoints use. */
export const NOT_FOUND_BY_TYPE: Record<
  ContextResourceType,
  () => NotFoundException
> = {
  DOCUMENT: documentNotFound,
  PROJECT: projectNotFound,
  TASK: taskNotFound,
  GOAL: goalNotFound,
  ENTITY: entityNotFound,
};

/**
 * The single write path for relationships — user-created and accepted AI
 * candidates alike: validate (rules) → lock + verify ownership of both
 * endpoints and the source document → insert (duplicate-safe).
 */
@Injectable()
export class ContextRelationshipsService {
  constructor(private readonly store: ContextRelationshipsStore) {}

  /** User-asserted relationship: source USER, confidence 1. */
  createFromUser(
    ownerId: string,
    dto: CreateContextRelationshipDto,
  ): Promise<ContextRelationshipResponse> {
    return this.create(ownerId, {
      source: { type: dto.sourceType, id: dto.sourceId },
      relationshipType: dto.relationshipType,
      target: { type: dto.targetType, id: dto.targetId },
      provenance: 'USER',
      confidence: 1,
      sourceDocumentId: dto.sourceDocumentId ?? null,
      metadata: dto.metadata ?? null,
    });
  }

  /**
   * @throws BadRequestException for invalid relationships,
   *   NotFoundException if any referenced resource is missing or not the
   *   owner's, ConflictException if the relationship already exists.
   */
  async create(
    ownerId: string,
    input: NewRelationship,
  ): Promise<ContextRelationshipResponse> {
    assertValidRelationship(input);
    const result = await this.store.insert(ownerId, input);
    switch (result.kind) {
      case 'not-found':
        throw NOT_FOUND_BY_TYPE[result.ref.type]();
      case 'duplicate':
        throw new ConflictException('This relationship already exists.');
      case 'created':
        return toContextRelationshipResponse(result.relationship);
    }
  }

  async list(
    ownerId: string,
    filter: RelationshipFilter,
  ): Promise<ContextRelationshipResponse[]> {
    const rows = await this.store.list(ownerId, filter);
    return rows.map(toContextRelationshipResponse);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    if (!(await this.store.remove(ownerId, id))) {
      throw new NotFoundException('Relationship not found.');
    }
  }
}

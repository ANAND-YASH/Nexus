import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  type PipeTransform,
  Post,
} from '@nestjs/common';
import type {
  ContextRelationshipResponse,
  ContextResourceType,
  ContextResponse,
  RelationshipCandidatesResponse,
} from '@nexus/types';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RelationshipCandidatesService } from '../candidates/relationship-candidates.service';
import { ContextService } from './context.service';

/** URL segment → resource type. */
const RESOURCE_SEGMENTS: Record<string, ContextResourceType> = {
  documents: 'DOCUMENT',
  projects: 'PROJECT',
  tasks: 'TASK',
  goals: 'GOAL',
  entities: 'ENTITY',
};

class ParseResourceTypePipe implements PipeTransform<
  string,
  ContextResourceType
> {
  transform(value: string): ContextResourceType {
    const type = RESOURCE_SEGMENTS[value];
    if (!type) {
      throw new BadRequestException(
        `resourceType must be one of: ${Object.keys(RESOURCE_SEGMENTS).join(', ')}`,
      );
    }
    return type;
  }
}

class ParseCandidateKeyPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[0-9a-f]{32}$/.test(value)) {
      throw new BadRequestException('Invalid candidate key.');
    }
    return value;
  }
}

/**
 * Context aggregation and AI relationship candidates. Registered after the
 * entities and relationships controllers so their fixed paths win.
 */
@Controller('context')
export class ContextController {
  constructor(
    private readonly context: ContextService,
    private readonly candidates: RelationshipCandidatesService,
  ) {}

  /**
   * Entity context lives here because `GET /context/entities/:id` is the
   * entity CRUD read.
   */
  @Get('entities/:id/context')
  entityContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContextResponse> {
    return this.context.getContext(user.id, { type: 'ENTITY', id });
  }

  @Get('documents/:id/candidates')
  listCandidates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RelationshipCandidatesResponse> {
    return this.candidates.list(user.id, id);
  }

  /** 201 with the stored (AI-sourced) relationship. */
  @Post('documents/:id/candidates/:key/accept')
  acceptCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('key', ParseCandidateKeyPipe) key: string,
  ): Promise<ContextRelationshipResponse> {
    return this.candidates.accept(user.id, id, key);
  }

  @Get(':resourceType/:resourceId')
  getContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resourceType', ParseResourceTypePipe) type: ContextResourceType,
    @Param('resourceId', ParseUUIDPipe) id: string,
  ): Promise<ContextResponse> {
    return this.context.getContext(user.id, { type, id });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  DocumentDetailResponse,
  DocumentResponse,
  DocumentSummaryResponse,
} from '@nexus/types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  UpdateDocumentDto,
} from './dto/document.dto';
import { DocumentLinksService } from './links/document-links.service';

/** Authenticated by the global JwtAuthGuard; owner comes from the token. */
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly links: DocumentLinksService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    return this.documents.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDocumentsQueryDto,
  ): Promise<DocumentSummaryResponse[]> {
    return this.documents.list(user.id, query);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentDetailResponse> {
    return this.documents.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponse> {
    return this.documents.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.documents.remove(user.id, id);
  }

  // Relationships: 204 No Content. Linking is idempotent.

  @Post(':id/projects/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  linkProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    return this.links.link(user.id, id, 'project', projectId);
  }

  @Delete(':id/projects/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    return this.links.unlink(user.id, id, 'project', projectId);
  }

  @Post(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  linkTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    return this.links.link(user.id, id, 'task', taskId);
  }

  @Delete(':id/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    return this.links.unlink(user.id, id, 'task', taskId);
  }

  @Post(':id/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  linkGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ): Promise<void> {
    return this.links.link(user.id, id, 'goal', goalId);
  }

  @Delete(':id/goals/:goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ): Promise<void> {
    return this.links.unlink(user.id, id, 'goal', goalId);
  }
}

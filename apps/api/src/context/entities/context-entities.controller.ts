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
import type { ContextEntityResponse, ContextEntitySummary } from '@nexus/types';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ContextEntitiesService } from './context-entities.service';
import {
  CreateContextEntityDto,
  ListContextEntitiesQueryDto,
  UpdateContextEntityDto,
} from './dto/context-entity.dto';

/** Authenticated by the global JwtAuthGuard; owner comes from the token. */
@Controller('context/entities')
export class ContextEntitiesController {
  constructor(private readonly entities: ContextEntitiesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContextEntityDto,
  ): Promise<ContextEntityResponse> {
    return this.entities.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContextEntitiesQueryDto,
  ): Promise<ContextEntitySummary[]> {
    return this.entities.list(user.id, query);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContextEntityResponse> {
    return this.entities.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContextEntityDto,
  ): Promise<ContextEntityResponse> {
    return this.entities.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.entities.remove(user.id, id);
  }
}

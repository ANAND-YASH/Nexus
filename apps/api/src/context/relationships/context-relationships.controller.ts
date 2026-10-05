import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { ContextRelationshipResponse } from '@nexus/types';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { definedOnly } from '../../common/validation';
import { ContextRelationshipsService } from './context-relationships.service';
import {
  CreateContextRelationshipDto,
  ListContextRelationshipsQueryDto,
} from './dto/context-relationship.dto';

/** Authenticated by the global JwtAuthGuard; owner comes from the token. */
@Controller('context/relationships')
export class ContextRelationshipsController {
  constructor(private readonly relationships: ContextRelationshipsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContextRelationshipDto,
  ): Promise<ContextRelationshipResponse> {
    return this.relationships.createFromUser(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContextRelationshipsQueryDto,
  ): Promise<ContextRelationshipResponse[]> {
    return this.relationships.list(user.id, definedOnly(query));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.relationships.remove(user.id, id);
  }
}

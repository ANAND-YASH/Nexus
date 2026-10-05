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
import type { GoalResponse } from '@nexus/types';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateGoalDto,
  ListGoalsQueryDto,
  UpdateGoalDto,
} from './dto/goal.dto';
import { GoalsService } from './goals.service';

/** Authenticated by the global JwtAuthGuard; owner comes from the token. */
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalResponse> {
    return this.goals.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListGoalsQueryDto,
  ): Promise<GoalResponse[]> {
    return this.goals.list(user.id, query);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GoalResponse> {
    return this.goals.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalResponse> {
    return this.goals.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.goals.remove(user.id, id);
  }
}

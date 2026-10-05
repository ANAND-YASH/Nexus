import { TaskPriority, TaskStatus } from '@nexus/types';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  IsOptionalNonNull,
  NAME_MAX_LENGTH,
  Trim,
} from '../../common/validation';

// An offset-less timestamp would silently be read in the server's timezone.
const WITH_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;
const DUE_AT_MESSAGE =
  'dueAt must be an ISO 8601 timestamp with a timezone, e.g. 2026-10-31T17:00:00Z';

/** completedAt is intentionally absent: the server manages it from status. */
export class CreateTaskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: DUE_AT_MESSAGE })
  @Matches(WITH_TIMEZONE, { message: DUE_AT_MESSAGE })
  dueAt?: string | null;
}

/**
 * PATCH: omitted = unchanged; `null` clears `description`, `projectId` (detach
 * from project) and `dueAt`.
 */
export class UpdateTaskDto {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptionalNonNull()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptionalNonNull()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: DUE_AT_MESSAGE })
  @Matches(WITH_TIMEZONE, { message: DUE_AT_MESSAGE })
  dueAt?: string | null;
}

export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}

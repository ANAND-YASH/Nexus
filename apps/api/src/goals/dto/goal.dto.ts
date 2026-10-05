import { GoalStatus } from '@nexus/types';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  IsOptionalNonNull,
  NAME_MAX_LENGTH,
  Trim,
} from '../../common/validation';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ONLY_MESSAGE = 'targetDate must be a date in YYYY-MM-DD format';

export class CreateGoalDto {
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
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  // strict ISO 8601 also rejects impossible dates such as 2026-02-30.
  @IsOptional()
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_ONLY_MESSAGE })
  targetDate?: string | null;
}

/** PATCH: omitted = unchanged; `null` clears `description` / `targetDate`. */
export class UpdateGoalDto {
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

  @IsOptionalNonNull()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  @IsISO8601({ strict: true }, { message: DATE_ONLY_MESSAGE })
  targetDate?: string | null;
}

export class ListGoalsQueryDto {
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}

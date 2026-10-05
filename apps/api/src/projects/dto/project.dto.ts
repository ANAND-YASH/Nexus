import { ProjectStatus } from '@nexus/types';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  IsOptionalNonNull,
  NAME_MAX_LENGTH,
  Trim,
} from '../../common/validation';

export class CreateProjectDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

/** PATCH: omitted = unchanged; `null` clears `description`. */
export class UpdateProjectDto {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptionalNonNull()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class ListProjectsQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

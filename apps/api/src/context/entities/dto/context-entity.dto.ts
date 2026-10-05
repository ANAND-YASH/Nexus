import { ContextEntityType } from '@nexus/types';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  IsBoundedJsonObject,
  IsOptionalNonNull,
  Trim,
} from '../../../common/validation';
import { ENTITY_NAME_MAX_LENGTH } from '../entity-name';

const SEARCH_MAX_LENGTH = 200;

/** ownerId, id and timestamps are not accepted (unknown fields → 400). */
export class CreateContextEntityDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ENTITY_NAME_MAX_LENGTH)
  name: string;

  @IsEnum(ContextEntityType)
  type: ContextEntityType;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @IsBoundedJsonObject()
  metadata?: Record<string, unknown> | null;
}

/** PATCH: omitted = unchanged; `null` clears description/metadata. */
export class UpdateContextEntityDto {
  @IsOptionalNonNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ENTITY_NAME_MAX_LENGTH)
  name?: string;

  @IsOptionalNonNull()
  @IsEnum(ContextEntityType)
  type?: ContextEntityType;

  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @IsOptional()
  @IsBoundedJsonObject()
  metadata?: Record<string, unknown> | null;
}

export class ListContextEntitiesQueryDto {
  @IsOptional()
  @IsEnum(ContextEntityType)
  type?: ContextEntityType;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SEARCH_MAX_LENGTH)
  search?: string;
}

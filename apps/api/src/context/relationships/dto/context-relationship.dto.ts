import {
  ContextResourceType,
  RelationshipSource,
  RelationshipType,
} from '@nexus/types';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IsBoundedJsonObject } from '../../../common/validation';

/**
 * `POST /api/context/relationships`. Always stored with source USER and
 * confidence 1: clients can't claim AI/SYSTEM/IMPORT provenance or a
 * confidence (unknown fields → 400).
 */
export class CreateContextRelationshipDto {
  @IsEnum(ContextResourceType)
  sourceType: ContextResourceType;

  @IsUUID()
  sourceId: string;

  @IsEnum(RelationshipType)
  relationshipType: RelationshipType;

  @IsEnum(ContextResourceType)
  targetType: ContextResourceType;

  @IsUUID()
  targetId: string;

  /** Optional supporting document; must be one of the caller's. */
  @IsOptional()
  @IsUUID()
  sourceDocumentId?: string | null;

  @IsOptional()
  @IsBoundedJsonObject()
  metadata?: Record<string, unknown> | null;
}

export class ListContextRelationshipsQueryDto {
  @IsOptional()
  @IsEnum(ContextResourceType)
  sourceType?: ContextResourceType;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsEnum(ContextResourceType)
  targetType?: ContextResourceType;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;

  @IsOptional()
  @IsEnum(RelationshipSource)
  source?: RelationshipSource;
}

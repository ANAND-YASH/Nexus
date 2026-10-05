import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  ContextEntityResponse,
  ContextEntitySummary,
  ContextEntityType,
} from '@nexus/types';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/errors';
import { definedOnly } from '../../common/validation';
import { ContextEntity } from './context-entity.entity';
import {
  toContextEntityResponse,
  toContextEntitySummary,
} from './context-entity.mapper';
import type {
  CreateContextEntityDto,
  ListContextEntitiesQueryDto,
  UpdateContextEntityDto,
} from './dto/context-entity.dto';
import { cleanEntityName, normalizeEntityName } from './entity-name';

const NAME_UNIQUE = 'UQ_context_entities_owner_id_type_normalized_name';

/** Escapes LIKE wildcards so search input is matched literally. */
function likePattern(search: string): string {
  return `%${normalizeEntityName(search).replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * Owner-scoped CRUD for context entities. Another user's entity is the same
 * 404 as a missing one. Names are de-duplicated per (owner, type) by their
 * normalized form, enforced by a unique constraint.
 */
@Injectable()
export class ContextEntitiesService {
  constructor(
    @InjectRepository(ContextEntity)
    private readonly entities: Repository<ContextEntity>,
  ) {}

  async create(
    ownerId: string,
    dto: CreateContextEntityDto,
  ): Promise<ContextEntityResponse> {
    const name = cleanEntityName(dto.name);
    const entity = this.entities.create({
      ownerId,
      name,
      normalizedName: normalizeEntityName(name),
      type: dto.type,
      description: dto.description ?? null,
      metadata: dto.metadata ?? null,
    });
    return toContextEntityResponse(await this.save(entity));
  }

  /** Newest first. `search` is a case-insensitive substring match on name. */
  async list(
    ownerId: string,
    query: ListContextEntitiesQueryDto,
  ): Promise<ContextEntitySummary[]> {
    const qb = this.entities
      .createQueryBuilder('entity')
      .where('entity.ownerId = :ownerId', { ownerId });
    if (query.type) {
      qb.andWhere('entity.type = :type', { type: query.type });
    }
    if (query.search) {
      qb.andWhere(`entity.normalizedName LIKE :pattern ESCAPE '\\'`, {
        pattern: likePattern(query.search),
      });
    }
    const rows = await qb
      .orderBy('entity.createdAt', 'DESC')
      .addOrderBy('entity.id', 'ASC')
      .getMany();
    return rows.map(toContextEntitySummary);
  }

  async get(ownerId: string, id: string): Promise<ContextEntityResponse> {
    return toContextEntityResponse(await this.findOwned(ownerId, id));
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateContextEntityDto,
  ): Promise<ContextEntityResponse> {
    const entity = await this.findOwned(ownerId, id);
    const { name, ...rest } = definedOnly(dto);
    Object.assign(entity, rest);
    if (name !== undefined) {
      entity.name = cleanEntityName(name);
      entity.normalizedName = normalizeEntityName(name);
    }
    return toContextEntityResponse(await this.save(entity));
  }

  /** Its relationships are removed by a database trigger. */
  async remove(ownerId: string, id: string): Promise<void> {
    const result = await this.entities.delete({ id, ownerId });
    if (!result.affected) throw entityNotFound();
  }

  /** @throws NotFoundException unless the entity exists and is the owner's. */
  async assertOwned(ownerId: string, id: string): Promise<void> {
    if (!(await this.entities.exists({ where: { id, ownerId } }))) {
      throw entityNotFound();
    }
  }

  /**
   * Returns the owner's entity with this type and (normalized) name, creating
   * it if needed. Safe under concurrency: the unique constraint decides.
   */
  async findOrCreate(
    ownerId: string,
    input: {
      name: string;
      type: ContextEntityType;
      description?: string | null;
    },
  ): Promise<ContextEntity> {
    const name = cleanEntityName(input.name);
    const normalizedName = normalizeEntityName(name);
    await this.entities
      .createQueryBuilder()
      .insert()
      .values({
        ownerId,
        name,
        normalizedName,
        type: input.type,
        description: input.description ?? null,
        metadata: null,
      })
      .orIgnore()
      .execute();
    return this.entities.findOneOrFail({
      where: { ownerId, type: input.type, normalizedName },
    });
  }

  private async findOwned(ownerId: string, id: string): Promise<ContextEntity> {
    const entity = await this.entities.findOne({ where: { id, ownerId } });
    if (!entity) throw entityNotFound();
    return entity;
  }

  private async save(entity: ContextEntity): Promise<ContextEntity> {
    try {
      return await this.entities.save(entity);
    } catch (error) {
      if (isUniqueViolation(error, NAME_UNIQUE)) {
        throw new ConflictException(
          'An entity with this name and type already exists.',
        );
      }
      throw error;
    }
  }
}

export const entityNotFound = () => new NotFoundException('Entity not found.');

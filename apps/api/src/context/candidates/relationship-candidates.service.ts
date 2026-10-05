import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  ContextRelationshipResponse,
  RelationshipCandidateResponse,
  RelationshipCandidatesResponse,
  ResourceRef,
} from '@nexus/types';
import { In, Repository } from 'typeorm';
import { DocumentAnalysis } from '../../ai/document-analysis/document-analysis.entity';
import { DocumentsService } from '../../documents/documents.service';
import { ContextEntitiesService } from '../entities/context-entities.service';
import { ContextEntity } from '../entities/context-entity.entity';
import { normalizeEntityName } from '../entities/entity-name';
import { ContextRelationshipsStore } from '../relationships/context-relationships.store';
import { ContextRelationshipsService } from '../relationships/context-relationships.service';
import { candidatesFromAnalysis } from './analysis-candidates';
import {
  type CandidateRef,
  candidateKey,
  parseRelationshipCandidate,
  type RelationshipCandidate,
} from './relationship-candidate';
import { ResourceOwnershipService } from '../resource-ownership.service';

/**
 * AI proposes → backend validates/resolves → user accepts → stored as an
 * AI-sourced relationship. Candidates are never persisted on their own, and
 * accepting re-derives the candidate on the server: clients can't inject
 * confidence, provenance, ids or entities.
 */
@Injectable()
export class RelationshipCandidatesService {
  constructor(
    private readonly documents: DocumentsService,
    private readonly ownership: ResourceOwnershipService,
    private readonly entities: ContextEntitiesService,
    private readonly relationships: ContextRelationshipsService,
    private readonly relationshipStore: ContextRelationshipsStore,
    @InjectRepository(DocumentAnalysis)
    private readonly analyses: Repository<DocumentAnalysis>,
    @InjectRepository(ContextEntity)
    private readonly entityRows: Repository<ContextEntity>,
  ) {}

  /** Candidates derived from the document's completed AI analysis. */
  async list(
    ownerId: string,
    documentId: string,
  ): Promise<RelationshipCandidatesResponse> {
    const { analysisStatus, candidates } = await this.derive(
      ownerId,
      documentId,
    );

    // Batch lookups (no N+1): existing entities and existing MENTIONS edges.
    const names = candidates
      .map((c) => c.target)
      .filter(
        (t): t is Extract<CandidateRef, { kind: 'entity' }> =>
          t.kind === 'entity',
      )
      .map((t) => normalizeEntityName(t.name));
    const existing = names.length
      ? await this.entityRows.find({
          where: { ownerId, normalizedName: In(names) },
          select: { id: true, type: true, normalizedName: true },
        })
      : [];
    const entityIds = new Map(
      existing.map((e) => [`${e.type}|${e.normalizedName}`, e.id]),
    );
    const linked = new Set(
      (
        await this.relationshipStore.list(ownerId, {
          sourceType: 'DOCUMENT',
          sourceId: documentId,
          relationshipType: 'MENTIONS',
          targetType: 'ENTITY',
        })
      ).map((r) => r.targetId),
    );

    return {
      documentId,
      analysisStatus,
      candidates: candidates.flatMap(
        (candidate): RelationshipCandidateResponse[] => {
          if (candidate.target.kind !== 'entity') return [];
          const { name, entityType } = candidate.target;
          const entityId =
            entityIds.get(`${entityType}|${normalizeEntityName(name)}`) ?? null;
          return [
            {
              key: candidateKey(candidate),
              sourceType: 'DOCUMENT',
              sourceId: documentId,
              relationshipType: candidate.relationshipType,
              target: { type: 'ENTITY', entityId, name, entityType },
              confidence: candidate.confidence,
              sourceDocumentId: candidate.sourceDocumentId,
              evidence: candidate.evidence,
              alreadyExists: entityId !== null && linked.has(entityId),
            },
          ];
        },
      ),
    };
  }

  /**
   * Accepts one candidate by key. It is re-derived from the current analysis
   * and fully validated; the stored relationship keeps source AI, its
   * confidence and the source document.
   */
  async accept(
    ownerId: string,
    documentId: string,
    key: string,
  ): Promise<ContextRelationshipResponse> {
    const { candidates } = await this.derive(ownerId, documentId);
    const candidate = candidates.find((c) => candidateKey(c) === key);
    if (!candidate) throw new NotFoundException('Candidate not found.');
    return this.store(ownerId, candidate, { acceptedFrom: 'analysis' });
  }

  /**
   * The validation gate for any AI-proposed relationship, whatever produced
   * it: strict shape validation, owner-scoped resolution of every reference
   * and of the source document, then the normal relationship write path.
   * @throws CandidateRejectedError, NotFoundException, BadRequestException,
   *   ConflictException.
   */
  async store(
    ownerId: string,
    raw: unknown,
    metadata: Record<string, unknown> = {},
  ): Promise<ContextRelationshipResponse> {
    const candidate = parseRelationshipCandidate(raw);
    await this.documents.assertOwned(ownerId, candidate.sourceDocumentId);
    const source = await this.resolve(ownerId, candidate.source, candidate);
    const target = await this.resolve(ownerId, candidate.target, candidate);
    return this.relationships.create(ownerId, {
      source,
      relationshipType: candidate.relationshipType,
      target,
      provenance: 'AI',
      confidence: candidate.confidence,
      sourceDocumentId: candidate.sourceDocumentId,
      metadata: { ...metadata, evidence: candidate.evidence },
    });
  }

  /** Resource refs must be the owner's; entity refs are found or created. */
  private async resolve(
    ownerId: string,
    ref: CandidateRef,
    candidate: RelationshipCandidate,
  ): Promise<ResourceRef> {
    if (ref.kind === 'resource') {
      // AI-supplied ids are only usable if they are the owner's.
      await this.ownership.assertOwned(ownerId, ref.type, ref.id);
      return { type: ref.type, id: ref.id };
    }
    const entity = await this.entities.findOrCreate(ownerId, {
      name: ref.name,
      type: ref.entityType,
      description: candidate.evidence,
    });
    return { type: 'ENTITY', id: entity.id };
  }

  private async derive(ownerId: string, documentId: string) {
    await this.documents.assertOwned(ownerId, documentId);
    const analysis = await this.analyses.findOne({
      where: { ownerId, documentId },
      select: { id: true, status: true, entities: true },
    });
    return {
      analysisStatus: analysis?.status ?? null,
      candidates:
        analysis?.status === 'COMPLETED'
          ? candidatesFromAnalysis(documentId, analysis.entities)
          : [],
    };
  }
}

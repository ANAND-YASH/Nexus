import { NotFoundException } from '@nestjs/common';
import type { AnalysisEntity } from '@nexus/types';
import type { Repository } from 'typeorm';
import type { DocumentAnalysis } from '../../ai/document-analysis/document-analysis.entity';
import type { DocumentsService } from '../../documents/documents.service';
import type { ContextEntitiesService } from '../entities/context-entities.service';
import type { ContextEntity } from '../entities/context-entity.entity';
import { normalizeEntityName } from '../entities/entity-name';
import { ContextRelationshipsService } from '../relationships/context-relationships.service';
import type { ResourceOwnershipService } from '../resource-ownership.service';
import {
  ALICE,
  BOB,
  InMemoryRelationshipsStore,
  uuid,
} from '../testing/context-test-utils';
import { CandidateRejectedError } from './relationship-candidate';
import { RelationshipCandidatesService } from './relationship-candidates.service';

describe('RelationshipCandidatesService', () => {
  let store: InMemoryRelationshipsStore;
  let entities: ContextEntity[];
  let analyses: Partial<DocumentAnalysis>[];
  let service: RelationshipCandidatesService;
  let doc: string;

  /** Documents/resources the store knows exist, per owner. */
  const owns = (ownerId: string, type: string, id: string) =>
    store.owned.has(`${ownerId}|${type}|${id}`);

  beforeEach(() => {
    store = new InMemoryRelationshipsStore();
    entities = [];
    analyses = [];
    doc = store.own(ALICE, { type: 'DOCUMENT', id: uuid() }).id;

    const documents = {
      assertOwned: (ownerId: string, id: string) =>
        owns(ownerId, 'DOCUMENT', id)
          ? Promise.resolve()
          : Promise.reject(new NotFoundException('Document not found.')),
    } as unknown as DocumentsService;
    const ownership = {
      assertOwned: (ownerId: string, type: string, id: string) =>
        owns(ownerId, type, id)
          ? Promise.resolve()
          : Promise.reject(new NotFoundException(`${type} not found.`)),
    } as unknown as ResourceOwnershipService;
    const entityService = {
      findOrCreate: (
        ownerId: string,
        input: { name: string; type: ContextEntity['type'] },
      ) => {
        const normalizedName = normalizeEntityName(input.name);
        let entity = entities.find(
          (e) =>
            e.ownerId === ownerId &&
            e.type === input.type &&
            e.normalizedName === normalizedName,
        );
        if (!entity) {
          entity = {
            id: uuid(),
            ownerId,
            type: input.type,
            name: input.name,
            normalizedName,
          } as ContextEntity;
          entities.push(entity);
          store.own(ownerId, { type: 'ENTITY', id: entity.id });
        }
        return Promise.resolve(entity);
      },
    } as unknown as ContextEntitiesService;
    const analysisRepo = {
      findOne: ({
        where,
      }: {
        where: { ownerId: string; documentId: string };
      }) =>
        Promise.resolve(
          analyses.find(
            (a) =>
              a.ownerId === where.ownerId && a.documentId === where.documentId,
          ) ?? null,
        ),
    } as unknown as Repository<DocumentAnalysis>;
    const entityRepo = {
      find: ({ where }: { where: { ownerId: string } }) =>
        Promise.resolve(entities.filter((e) => e.ownerId === where.ownerId)),
    } as unknown as Repository<ContextEntity>;

    service = new RelationshipCandidatesService(
      documents,
      ownership,
      entityService,
      new ContextRelationshipsService(store.asStore()),
      store.asStore(),
      analysisRepo,
      entityRepo,
    );
  });

  const analyzed = (
    documentId: string,
    list: AnalysisEntity[],
    status = 'COMPLETED',
  ) =>
    analyses.push({
      ownerId: ALICE,
      documentId,
      status: status as DocumentAnalysis['status'],
      entities: list,
    });

  describe('list', () => {
    it('is empty until the analysis has completed', async () => {
      analyzed(doc, [{ name: 'Acme', type: 'organization' }], 'PROCESSING');
      await expect(service.list(ALICE, doc)).resolves.toEqual({
        documentId: doc,
        analysisStatus: 'PROCESSING',
        candidates: [],
      });
    });

    it('returns candidates without persisting anything', async () => {
      analyzed(doc, [
        { name: 'Acme', type: 'organization', description: 'Vendor' },
      ]);

      const { candidates } = await service.list(ALICE, doc);

      expect(candidates).toEqual([
        {
          key: expect.stringMatching(/^[0-9a-f]{32}$/),
          sourceType: 'DOCUMENT',
          sourceId: doc,
          relationshipType: 'MENTIONS',
          target: {
            type: 'ENTITY',
            entityId: null,
            name: 'Acme',
            entityType: 'ORGANIZATION',
          },
          confidence: 0.8,
          sourceDocumentId: doc,
          evidence: 'Vendor',
          alreadyExists: false,
        },
      ]);
      expect(store.rows).toHaveLength(0);
      expect(entities).toHaveLength(0);
    });

    it("404s for another user's document", async () => {
      const bobsDoc = store.own(BOB, { type: 'DOCUMENT', id: uuid() }).id;
      await expect(service.list(ALICE, bobsDoc)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('accept', () => {
    it('creates the entity and an AI relationship with provenance', async () => {
      analyzed(doc, [
        { name: 'Acme', type: 'organization', description: 'Vendor' },
      ]);
      const [candidate] = (await service.list(ALICE, doc)).candidates;

      const relationship = await service.accept(ALICE, doc, candidate!.key);

      expect(relationship).toMatchObject({
        sourceType: 'DOCUMENT',
        sourceId: doc,
        relationshipType: 'MENTIONS',
        targetType: 'ENTITY',
        targetId: entities[0]!.id,
        source: 'AI',
        confidence: 0.8,
        sourceDocumentId: doc,
        metadata: { acceptedFrom: 'analysis', evidence: 'Vendor' },
      });
      const after = (await service.list(ALICE, doc)).candidates[0]!;
      expect(after).toMatchObject({
        target: { entityId: entities[0]!.id },
        alreadyExists: true,
      });
    });

    it('rejects an unknown key (no client-supplied candidates)', async () => {
      analyzed(doc, [{ name: 'Acme', type: 'organization' }]);
      await expect(service.accept(ALICE, doc, 'f'.repeat(32))).rejects.toThrow(
        new NotFoundException('Candidate not found.'),
      );
      expect(store.rows).toHaveLength(0);
    });
  });

  describe('store (validation gate for any AI proposal)', () => {
    const proposal = (patch: Record<string, unknown> = {}) => ({
      source: { kind: 'resource', type: 'DOCUMENT', id: doc },
      relationshipType: 'MENTIONS',
      target: { kind: 'entity', name: 'Acme', entityType: 'ORGANIZATION' },
      confidence: 0.9,
      sourceDocumentId: doc,
      evidence: null,
      ...patch,
    });

    it('rejects malformed proposals before any lookup', async () => {
      await expect(
        service.store(ALICE, proposal({ ownerId: ALICE })),
      ).rejects.toBeInstanceOf(CandidateRejectedError);
      await expect(
        service.store(ALICE, proposal({ confidence: 7 })),
      ).rejects.toBeInstanceOf(CandidateRejectedError);
      expect(entities).toHaveLength(0);
      expect(store.rows).toHaveLength(0);
    });

    it("can't reference another user's resource by id", async () => {
      const bobsProject = store.own(BOB, { type: 'PROJECT', id: uuid() }).id;

      await expect(
        service.store(
          ALICE,
          proposal({
            relationshipType: 'RELATED_TO',
            target: { kind: 'resource', type: 'PROJECT', id: bobsProject },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
      expect(store.rows).toHaveLength(0);
    });

    it("can't use another user's document as provenance", async () => {
      const bobsDoc = store.own(BOB, { type: 'DOCUMENT', id: uuid() }).id;
      await expect(
        service.store(ALICE, proposal({ sourceDocumentId: bobsDoc })),
      ).rejects.toThrow('Document not found.');
      expect(entities).toHaveLength(0);
    });

    it('rejects references to resources that do not exist', async () => {
      await expect(
        service.store(
          ALICE,
          proposal({
            relationshipType: 'RELATED_TO',
            target: { kind: 'resource', type: 'TASK', id: uuid() },
          }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('still applies relationship rules (e.g. no self-relationships)', async () => {
      await expect(
        service.store(
          ALICE,
          proposal({
            relationshipType: 'RELATED_TO',
            target: { kind: 'resource', type: 'DOCUMENT', id: doc },
          }),
        ),
      ).rejects.toThrow('A resource cannot have a relationship with itself.');
    });
  });
});

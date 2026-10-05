import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  CreateContextRelationshipDto,
  ListContextRelationshipsQueryDto,
} from './context-relationship.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

async function errorsFor(
  metatype: ArgumentMetadata['metatype'],
  value: unknown,
): Promise<string[]> {
  try {
    await pipe.transform(value, { type: 'body', metatype });
    return [];
  } catch (error) {
    return (error as { getResponse(): { message: string[] } }).getResponse()
      .message;
  }
}

const ID = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';
const valid = {
  sourceType: 'PROJECT',
  sourceId: ID,
  relationshipType: 'RELATED_TO',
  targetType: 'GOAL',
  targetId: ID,
};

describe('CreateContextRelationshipDto', () => {
  it('accepts a valid body', async () => {
    expect(await errorsFor(CreateContextRelationshipDto, valid)).toEqual([]);
  });

  it('rejects client-supplied provenance, confidence and ownerId', async () => {
    const errors = await errorsFor(CreateContextRelationshipDto, {
      ...valid,
      source: 'AI',
      confidence: 0.1,
      ownerId: ID,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'property source should not exist',
        'property confidence should not exist',
        'property ownerId should not exist',
      ]),
    );
  });

  it('rejects unknown enums and malformed ids', async () => {
    const errors = await errorsFor(CreateContextRelationshipDto, {
      ...valid,
      sourceType: 'USER',
      relationshipType: 'OWNS',
      targetId: '123',
      sourceDocumentId: 'doc',
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^sourceType must be/),
        expect.stringMatching(/^relationshipType must be/),
        'targetId must be a UUID',
        'sourceDocumentId must be a UUID',
      ]),
    );
  });

  it('validates list filters', async () => {
    expect(
      await errorsFor(ListContextRelationshipsQueryDto, {
        source: 'AI',
        sourceType: 'DOCUMENT',
        sourceId: ID,
      }),
    ).toEqual([]);
    expect(
      await errorsFor(ListContextRelationshipsQueryDto, {
        source: 'ROBOT',
        ownerId: ID,
      }),
    ).toHaveLength(2);
  });
});

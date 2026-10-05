import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  CreateContextEntityDto,
  ListContextEntitiesQueryDto,
  UpdateContextEntityDto,
} from './context-entity.dto';

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

describe('Context entity DTOs', () => {
  it('accepts a valid entity', async () => {
    expect(
      await errorsFor(CreateContextEntityDto, {
        name: 'Ada',
        type: 'PERSON',
        description: 'x',
        metadata: { role: 'lead' },
      }),
    ).toEqual([]);
  });

  it('requires name and type; rejects blank names and unknown types', async () => {
    const errors = await errorsFor(CreateContextEntityDto, {
      name: '   ',
      type: 'ALIEN',
    });
    expect(errors).toContain('name should not be empty');
    expect(errors).toContainEqual(expect.stringMatching(/^type must be/));
  });

  it('rejects names over 200 characters', async () => {
    expect(
      await errorsFor(CreateContextEntityDto, {
        name: 'x'.repeat(201),
        type: 'PERSON',
      }),
    ).toContain('name must be shorter than or equal to 200 characters');
  });

  it.each([
    ['an array', [1, 2]],
    ['a string', 'meta'],
    ['an oversized object', { blob: 'x'.repeat(5_000) }],
  ])('rejects metadata that is %s', async (_label, metadata) => {
    expect(
      await errorsFor(CreateContextEntityDto, {
        name: 'A',
        type: 'PERSON',
        metadata,
      }),
    ).toContain('metadata must be a JSON object of at most 4096 bytes');
  });

  it('rejects ownerId and other unknown fields', async () => {
    expect(
      await errorsFor(CreateContextEntityDto, {
        name: 'A',
        type: 'PERSON',
        ownerId: 'x',
        normalizedName: 'a',
      }),
    ).toEqual(
      expect.arrayContaining([
        'property ownerId should not exist',
        'property normalizedName should not exist',
      ]),
    );
  });

  it('PATCH: null rejected for name/type, allowed for description/metadata', async () => {
    expect(
      await errorsFor(UpdateContextEntityDto, { name: null }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(UpdateContextEntityDto, { type: null }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(UpdateContextEntityDto, {
        description: null,
        metadata: null,
      }),
    ).toEqual([]);
  });

  it('validates list filters', async () => {
    expect(
      await errorsFor(ListContextEntitiesQueryDto, {
        type: 'CONCEPT',
        search: 'ai',
      }),
    ).toEqual([]);
    expect(
      await errorsFor(ListContextEntitiesQueryDto, { type: 'nope' }),
    ).not.toHaveLength(0);
  });
});

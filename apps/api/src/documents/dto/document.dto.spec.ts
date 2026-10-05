import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  UpdateDocumentDto,
} from './document.dto';

// Same options as configureApp().
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const transform = (metatype: ArgumentMetadata['metatype'], value: unknown) =>
  pipe.transform(value, { type: 'body', metatype });

async function errorsFor(
  metatype: ArgumentMetadata['metatype'],
  value: unknown,
): Promise<string[]> {
  try {
    await transform(metatype, value);
    return [];
  } catch (error) {
    return (error as { getResponse(): { message: string[] } }).getResponse()
      .message;
  }
}

const valid = {
  title: 'Notes',
  content: 'Body',
  mimeType: 'text/markdown',
  sourceType: 'MANUAL',
};

describe('CreateDocumentDto', () => {
  it('accepts a full payload and normalizes it', async () => {
    const dto = (await transform(CreateDocumentDto, {
      title: '  Auth design  ',
      content: '  keep whitespace\n',
      mimeType: ' Text/Markdown ',
      sourceType: 'URL',
      sourceUrl: ' https://example.com/docs?page=2 ',
      fileName: ' design.md ',
      fileSizeBytes: 0,
      checksum: 'ABCDEF0123456789ABCDEF0123456789',
    })) as CreateDocumentDto;

    expect(dto).toMatchObject({
      title: 'Auth design',
      content: '  keep whitespace\n',
      mimeType: 'text/markdown',
      sourceUrl: 'https://example.com/docs?page=2',
      fileName: 'design.md',
      checksum: 'abcdef0123456789abcdef0123456789',
    });
  });

  it('requires title, content, mimeType and sourceType', async () => {
    const errors = await errorsFor(CreateDocumentDto, {});
    for (const field of ['title', 'content', 'mimeType', 'sourceType']) {
      expect(errors).toContainEqual(
        expect.stringMatching(new RegExp(`^${field}`)),
      );
    }
  });

  it('rejects whitespace-only content and over-long text', async () => {
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, content: ' \n\t ' }),
    ).toContain('content must not be empty');
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, title: 'x'.repeat(301) }),
    ).toContain('title must be shorter than or equal to 300 characters');
    expect(
      await errorsFor(CreateDocumentDto, {
        ...valid,
        content: 'x'.repeat(200_001),
      }),
    ).toContain('content must be shorter than or equal to 200000 characters');
  });

  it.each([
    'markdown',
    'text/',
    '/plain',
    'text/plain; charset=utf-8',
    'a b/c',
  ])('rejects mimeType %p', async (mimeType) => {
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, mimeType }),
    ).toContain('mimeType must be a MIME type such as text/markdown');
  });

  it('rejects an unknown sourceType', async () => {
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, sourceType: 'EMAIL' }),
    ).toContainEqual(expect.stringMatching(/^sourceType must be/));
  });

  it.each([
    'not a url',
    'ftp://example.com/file',
    'javascript:alert(1)',
    'example.com/no-protocol',
    'https://user:secret@example.com/private',
  ])('rejects sourceUrl %p', async (sourceUrl) => {
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, sourceUrl }),
    ).toContain('sourceUrl must be an http(s) URL');
  });

  it.each([-1, 1.5, '10', Number.MAX_SAFE_INTEGER + 2])(
    'rejects fileSizeBytes %p',
    async (fileSizeBytes) => {
      expect(
        await errorsFor(CreateDocumentDto, { ...valid, fileSizeBytes }),
      ).not.toHaveLength(0);
    },
  );

  it.each([
    'abc',
    'z'.repeat(64),
    'a'.repeat(31),
    'a'.repeat(129),
    'sha256:' + 'a'.repeat(64),
  ])('rejects checksum %p', async (checksum) => {
    expect(
      await errorsFor(CreateDocumentDto, { ...valid, checksum }),
    ).toContain(
      'checksum must be a hex digest (32–128 hexadecimal characters)',
    );
  });

  it('rejects ownerId, id and timestamps from the client', async () => {
    const errors = await errorsFor(CreateDocumentDto, {
      ...valid,
      ownerId: '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11',
      id: 'x',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    for (const field of ['ownerId', 'id', 'createdAt', 'updatedAt']) {
      expect(errors).toContain(`property ${field} should not exist`);
    }
  });
});

describe('UpdateDocumentDto (PATCH)', () => {
  it('accepts an empty body', async () => {
    expect(await errorsFor(UpdateDocumentDto, {})).toEqual([]);
  });

  it.each(['title', 'content', 'mimeType', 'sourceType'])(
    'rejects null for required field %s',
    async (field) => {
      expect(
        await errorsFor(UpdateDocumentDto, { [field]: null }),
      ).not.toHaveLength(0);
    },
  );

  it('accepts null for nullable fields', async () => {
    expect(
      await errorsFor(UpdateDocumentDto, {
        sourceUrl: null,
        fileName: null,
        fileSizeBytes: null,
        checksum: null,
      }),
    ).toEqual([]);
  });

  it('rejects id, ownerId and timestamps', async () => {
    const errors = await errorsFor(UpdateDocumentDto, {
      id: 'x',
      ownerId: 'x',
      createdAt: 'x',
      updatedAt: 'x',
    });
    expect(errors).toHaveLength(4);
  });
});

describe('ListDocumentsQueryDto', () => {
  it('normalizes mimeType and trims search', async () => {
    await expect(
      transform(ListDocumentsQueryDto, {
        sourceType: 'UPLOAD',
        mimeType: 'Application/PDF',
        search: '  refresh tokens ',
      }),
    ).resolves.toMatchObject({
      sourceType: 'UPLOAD',
      mimeType: 'application/pdf',
      search: 'refresh tokens',
    });
  });

  it('rejects a blank or over-long search and unknown parameters', async () => {
    expect(
      await errorsFor(ListDocumentsQueryDto, { search: '   ' }),
    ).not.toHaveLength(0);
    expect(
      await errorsFor(ListDocumentsQueryDto, { search: 'x'.repeat(201) }),
    ).not.toHaveLength(0);
    expect(await errorsFor(ListDocumentsQueryDto, { ownerId: 'x' })).toContain(
      'property ownerId should not exist',
    );
  });
});

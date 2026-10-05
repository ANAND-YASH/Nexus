import { type ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { LoginDto, RegisterDto } from './credentials.dto';
import { RefreshTokenDto } from './refresh-token.dto';

// Same options as configureApp().
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const validate = (metatype: ArgumentMetadata['metatype'], value: unknown) =>
  pipe.transform(value, { type: 'body', metatype });

async function errorsFor(
  metatype: ArgumentMetadata['metatype'],
  value: unknown,
): Promise<string[]> {
  try {
    await validate(metatype, value);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (
      (error as BadRequestException).getResponse() as { message: string[] }
    ).message;
  }
}

describe('RegisterDto', () => {
  it('accepts valid input and trims the email', async () => {
    await expect(
      validate(RegisterDto, {
        email: '  user@example.com ',
        password: 'long enough',
      }),
    ).resolves.toEqual({ email: 'user@example.com', password: 'long enough' });
  });

  it.each(['not-an-email', 'user@', '@example.com', '', 42, null])(
    'rejects invalid email %p',
    async (email) => {
      expect(
        await errorsFor(RegisterDto, { email, password: 'long enough' }),
      ).toContainEqual(expect.stringMatching(/^email/));
    },
  );

  it('rejects a password shorter than 8 characters', async () => {
    expect(
      await errorsFor(RegisterDto, {
        email: 'a@example.com',
        password: 'short',
      }),
    ).toContain('password must be longer than or equal to 8 characters');
  });

  it('rejects a password longer than 128 characters', async () => {
    expect(
      await errorsFor(RegisterDto, {
        email: 'a@example.com',
        password: 'x'.repeat(129),
      }),
    ).toContain('password must be shorter than or equal to 128 characters');
  });

  it('rejects a non-string password', async () => {
    expect(
      await errorsFor(RegisterDto, {
        email: 'a@example.com',
        password: 12345678,
      }),
    ).toContain('password must be a string');
  });

  it('rejects unexpected fields', async () => {
    expect(
      await errorsFor(RegisterDto, {
        email: 'a@example.com',
        password: 'long enough',
        isAdmin: true,
      }),
    ).toContain('property isAdmin should not exist');
  });

  it('rejects missing fields', async () => {
    const errors = await errorsFor(RegisterDto, {});
    expect(errors).toContainEqual(expect.stringMatching(/^email/));
    expect(errors).toContainEqual(expect.stringMatching(/^password/));
  });
});

describe('LoginDto', () => {
  it('does not apply the registration length policy', async () => {
    await expect(
      validate(LoginDto, { email: 'a@example.com', password: 'x' }),
    ).resolves.toBeInstanceOf(LoginDto);
  });

  it('rejects an empty password and unexpected fields', async () => {
    const errors = await errorsFor(LoginDto, {
      email: 'a@example.com',
      password: '',
      remember: true,
    });
    expect(errors).toContain(
      'password must be longer than or equal to 1 characters',
    );
    expect(errors).toContain('property remember should not exist');
  });
});

describe('RefreshTokenDto', () => {
  it.each([{}, { refreshToken: '' }, { refreshToken: 123 }])(
    'rejects %p',
    async (body) => {
      expect(await errorsFor(RefreshTokenDto, body)).not.toHaveLength(0);
    },
  );

  it('rejects unexpected fields', async () => {
    expect(
      await errorsFor(RefreshTokenDto, { refreshToken: 'a.b.c', userId: 'x' }),
    ).toContain('property userId should not exist');
  });
});

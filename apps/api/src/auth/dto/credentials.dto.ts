import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** 320 = RFC 5321 maximum, matching the `users.email` column. */
const EMAIL_MAX_LENGTH = 320;
export const PASSWORD_MIN_LENGTH = 8;
/** Generous for passphrases, bounded so hashing can't be used for DoS. */
export const PASSWORD_MAX_LENGTH = 128;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  // Not trimmed: whitespace is a legitimate part of a password.
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

/**
 * Login only checks shape, not the registration policy, so a policy change
 * never reveals anything about existing passwords.
 */
export class LoginDto {
  @Transform(trim)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

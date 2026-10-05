import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body of `POST /api/auth/refresh` and `POST /api/auth/logout`.
 * Only the shape is validated here (400); token validity is checked by the
 * service so every bad token gets the same 401.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  refreshToken: string;
}

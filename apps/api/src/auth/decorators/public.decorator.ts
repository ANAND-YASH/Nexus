import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Opts a route (or controller) out of the global JwtAuthGuard.
 * Everything else requires a valid access token by default.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

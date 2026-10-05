import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Express defaults to 100 kB, below the 200,000-character document content
 * limit (up to ~800 kB of UTF-8). 1 MB fits that with room for metadata.
 */
export const JSON_BODY_LIMIT = '1mb';

/**
 * Global HTTP setup shared by main.ts and the e2e tests, so tests exercise
 * exactly what runs in production.
 */
export function configureApp(app: INestApplication): INestApplication {
  (app as NestExpressApplication).useBodyParser('json', {
    limit: JSON_BODY_LIMIT,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      // Strip nothing silently: unknown fields are a 400, not ignored.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  return app;
}

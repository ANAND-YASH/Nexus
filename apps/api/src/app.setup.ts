import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Global HTTP setup shared by main.ts and the e2e tests, so tests exercise
 * exactly what runs in production.
 */
export function configureApp(app: INestApplication): INestApplication {
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

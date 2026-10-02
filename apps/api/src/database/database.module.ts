import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env';
import { buildDataSourceOptions } from './database.options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildDataSourceOptions({
          DATABASE_HOST: config.get('DATABASE_HOST', { infer: true }),
          DATABASE_PORT: config.get('DATABASE_PORT', { infer: true }),
          DATABASE_USER: config.get('DATABASE_USER', { infer: true }),
          DATABASE_PASSWORD: config.get('DATABASE_PASSWORD', { infer: true }),
          DATABASE_NAME: config.get('DATABASE_NAME', { infer: true }),
        }),
        // Fail startup after ~10s instead of Nest's default ~27s of retries.
        retryAttempts: 3,
        retryDelay: 2_000,
      }),
    }),
  ],
})
export class DatabaseModule {}

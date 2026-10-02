/**
 * DataSource for the TypeORM CLI (migrations). Not used by the Nest runtime,
 * which builds the same options via DatabaseModule.
 */
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env';
import { buildDataSourceOptions } from './database.options';

// Same precedence as ConfigModule: app-local .env, then the monorepo root.
// process.loadEnvFile never overrides variables already set in the shell.
for (const file of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) process.loadEnvFile(path);
}

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));

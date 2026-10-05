import { extname, join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { DocumentAnalysis } from '../ai/document-analysis/document-analysis.entity';
import { RefreshSession } from '../auth/sessions/refresh-session.entity';
import type { DatabaseEnv } from '../config/env';
import { Document } from '../documents/document.entity';
import { DocumentGoalLink } from '../documents/links/document-goal-link.entity';
import { DocumentProjectLink } from '../documents/links/document-project-link.entity';
import { DocumentTaskLink } from '../documents/links/document-task-link.entity';
import { Goal } from '../goals/goal.entity';
import { Project } from '../projects/project.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

/** Every entity the application maps. Register new entities here. */
export const entities = [
  User,
  RefreshSession,
  Project,
  Task,
  Goal,
  Document,
  DocumentProjectLink,
  DocumentTaskLink,
  DocumentGoalLink,
  DocumentAnalysis,
];

/**
 * Single source of truth for the database connection, shared by the Nest
 * runtime (DatabaseModule) and the TypeORM CLI (data-source.ts).
 */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    applicationName: 'nexus-api',
    entities,
    // .ts under ts-node (CLI), .js in the compiled build (where a *.ts glob
    // would also match emitted .d.ts files).
    migrations: [join(__dirname, 'migrations', `*${extname(__filename)}`)],
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'each',
    // Schema changes go through migrations only.
    synchronize: false,
    migrationsRun: false,
    // gen_random_uuid() is built into PostgreSQL 13+; never CREATE EXTENSION
    // implicitly at connect time (needs superuser in managed databases).
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    connectTimeoutMS: 5_000,
  };
}

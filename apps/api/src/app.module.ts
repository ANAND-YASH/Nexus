import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // App-local .env first, then the monorepo root .env.
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    GoalsModule,
    DocumentsModule,
  ],
})
export class AppModule {}

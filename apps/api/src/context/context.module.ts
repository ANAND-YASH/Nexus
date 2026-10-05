import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentAnalysis } from '../ai/document-analysis/document-analysis.entity';
import { Document } from '../documents/document.entity';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentGoalLink } from '../documents/links/document-goal-link.entity';
import { DocumentProjectLink } from '../documents/links/document-project-link.entity';
import { DocumentTaskLink } from '../documents/links/document-task-link.entity';
import { Goal } from '../goals/goal.entity';
import { GoalsModule } from '../goals/goals.module';
import { Project } from '../projects/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { Task } from '../tasks/task.entity';
import { TasksModule } from '../tasks/tasks.module';
import { RelationshipCandidatesService } from './candidates/relationship-candidates.service';
import { ContextEntitiesController } from './entities/context-entities.controller';
import { ContextEntitiesService } from './entities/context-entities.service';
import { ContextEntity } from './entities/context-entity.entity';
import { ContextGraphStore } from './graph/context-graph.store';
import { ContextController } from './graph/context.controller';
import { ContextService } from './graph/context.service';
import { ContextRelationship } from './relationships/context-relationship.entity';
import { ContextRelationshipsController } from './relationships/context-relationships.controller';
import { ContextRelationshipsService } from './relationships/context-relationships.service';
import { ContextRelationshipsStore } from './relationships/context-relationships.store';
import { ResourceOwnershipService } from './resource-ownership.service';

/**
 * Context graph: entities, typed relationships between a user's resources,
 * depth-1 context aggregation and AI relationship candidates.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContextEntity,
      ContextRelationship,
      Document,
      Project,
      Task,
      Goal,
      DocumentProjectLink,
      DocumentTaskLink,
      DocumentGoalLink,
      DocumentAnalysis,
    ]),
    DocumentsModule,
    ProjectsModule,
    TasksModule,
    GoalsModule,
  ],
  // Order matters: fixed paths (entities/:id, relationships) must be
  // registered before ContextController's `:resourceType/:resourceId`.
  controllers: [
    ContextEntitiesController,
    ContextRelationshipsController,
    ContextController,
  ],
  providers: [
    ContextEntitiesService,
    ContextRelationshipsStore,
    ContextRelationshipsService,
    ResourceOwnershipService,
    ContextGraphStore,
    ContextService,
    RelationshipCandidatesService,
  ],
})
export class ContextModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsModule } from '../goals/goals.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { Document } from './document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentGoalLink } from './links/document-goal-link.entity';
import { DocumentLinksService } from './links/document-links.service';
import { DocumentLinksStore } from './links/document-links.store';
import { DocumentProjectLink } from './links/document-project-link.entity';
import { DocumentTaskLink } from './links/document-task-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentProjectLink,
      DocumentTaskLink,
      DocumentGoalLink,
    ]),
    ProjectsModule,
    TasksModule,
    GoalsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentLinksService, DocumentLinksStore],
})
export class DocumentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), ProjectsModule],
  controllers: [TasksController],
  providers: [TasksService],
  // DocumentsModule uses assertOwned() to validate document → task links.
  exports: [TasksService],
})
export class TasksModule {}

import { Card } from '@nexus/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LocalDate } from '@/components/local-date';
import { ProjectActions } from '@/components/projects/project-actions';
import {
  ProjectContextEntities,
  ProjectDocuments,
  ProjectTasks,
} from '@/components/projects/project-detail';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { SectionPanel } from '@/components/section-panel';
import { NewTaskButton } from '@/components/tasks/new-task-button';
import { getProject } from '@/lib/api/projects';
import { listProjects } from '@/lib/api/workspace';
import { toProjectOptions } from '@/lib/tasks/project-options';

export async function generateMetadata({
  params,
}: PageProps<'/projects/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getProject(id)).name };
}

export default async function ProjectPage({
  params,
}: PageProps<'/projects/[id]'>) {
  const { id } = await params;
  const [project, projects] = await Promise.all([
    getProject(id),
    listProjects(),
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-muted">
          <li>
            <Link
              href="/projects"
              className="rounded-sm transition-colors hover:text-fg"
            >
              Projects
            </Link>
          </li>
          <li aria-hidden className="text-fg-subtle">
            /
          </li>
          <li aria-current="page" className="min-w-0 truncate text-fg">
            {project.name}
          </li>
        </ol>
      </nav>

      <Card as="section" aria-labelledby="project-title" className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                id="project-title"
                className="text-xl font-semibold tracking-tight break-words text-fg"
              >
                {project.name}
              </h2>
              <ProjectStatusBadge status={project.status} />
            </div>
            <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
              <div className="flex gap-1">
                <dt>Created</dt>
                <dd>
                  <LocalDate value={project.createdAt} />
                </dd>
              </div>
              <div className="flex gap-1">
                <dt>Updated</dt>
                <dd>
                  <LocalDate value={project.updatedAt} />
                </dd>
              </div>
            </dl>
          </div>
          <ProjectActions project={project} />
        </div>
        {project.description ? (
          <p className="mt-5 max-w-3xl text-sm leading-6 break-words whitespace-pre-line text-fg-muted">
            {project.description}
          </p>
        ) : (
          <p className="mt-5 text-sm text-fg-subtle italic">
            No description yet.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionPanel
          id="project-tasks"
          title="Tasks"
          description="Assigned to this project"
          href={`/tasks?status=all&project=${project.id}`}
          action={
            <NewTaskButton
              projects={toProjectOptions(projects)}
              defaultProjectId={project.id}
              variant="secondary"
              size="sm"
            />
          }
          subject="this project’s tasks"
          rows={5}
          className="lg:col-span-2"
        >
          <ProjectTasks projectId={project.id} />
        </SectionPanel>
        <div className="grid min-w-0 content-start gap-6">
          <SectionPanel
            id="project-documents"
            title="Documents"
            description="Linked knowledge"
            subject="linked documents"
            rows={3}
          >
            <ProjectDocuments projectId={project.id} />
          </SectionPanel>
          <SectionPanel
            id="project-context"
            title="Context"
            description="Connected people, tools and topics"
            subject="this project’s context"
            rows={3}
          >
            <ProjectContextEntities projectId={project.id} />
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageIntro } from '@/components/page-intro';
import { NewProjectButton } from '@/components/projects/new-project-button';
import {
  ProjectList,
  ProjectListSkeleton,
} from '@/components/projects/project-list';
import { SectionBoundary } from '@/components/states/section-boundary';
import { parseProjectFilter } from '@/lib/projects/list';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage({
  searchParams,
}: PageProps<'/projects'>) {
  const { status } = await searchParams;
  const filter = parseProjectFilter(status);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Group related tasks, documents and context, and see how each piece of work is progressing."
        actions={<NewProjectButton />}
      />
      <SectionBoundary subject="your projects" size="page">
        <Suspense key={filter} fallback={<ProjectListSkeleton />}>
          <ProjectList filter={filter} />
        </Suspense>
      </SectionBoundary>
    </div>
  );
}

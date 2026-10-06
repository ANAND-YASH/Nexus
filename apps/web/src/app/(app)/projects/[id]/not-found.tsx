import { buttonClasses, Card, EmptyState } from '@nexus/ui';
import Link from 'next/link';
import { ProjectsIcon } from '@/components/icons';

export default function ProjectNotFound() {
  return (
    <Card>
      <EmptyState
        size="page"
        titleAs="h2"
        icon={<ProjectsIcon />}
        title="Project not found"
        description="It may have been deleted, or the link may be wrong."
        action={
          <Link
            href="/projects"
            className={buttonClasses({ variant: 'secondary' })}
          >
            Back to projects
          </Link>
        }
      />
    </Card>
  );
}

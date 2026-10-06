import { buttonClasses, Card, EmptyState } from '@nexus/ui';
import Link from 'next/link';
import { TasksIcon } from '@/components/icons';

export default function TaskNotFound() {
  return (
    <Card>
      <EmptyState
        size="page"
        titleAs="h2"
        icon={<TasksIcon />}
        title="Task not found"
        description="It may have been deleted, or the link may be wrong."
        action={
          <Link
            href="/tasks"
            className={buttonClasses({ variant: 'secondary' })}
          >
            Back to tasks
          </Link>
        }
      />
    </Card>
  );
}

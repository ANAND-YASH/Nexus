import { buttonClasses, Card, EmptyState } from '@nexus/ui';
import Link from 'next/link';
import { GoalsIcon } from '@/components/icons';

export default function GoalNotFound() {
  return (
    <Card>
      <EmptyState
        size="page"
        titleAs="h2"
        icon={<GoalsIcon />}
        title="Goal not found"
        description="It may have been deleted, or the link may be wrong."
        action={
          <Link
            href="/goals"
            className={buttonClasses({ variant: 'secondary' })}
          >
            Back to goals
          </Link>
        }
      />
    </Card>
  );
}

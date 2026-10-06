import type { TaskStatus } from '@nexus/types';
import { Badge } from '@nexus/ui';
import { TASK_STATUS_META } from '@/lib/tasks/meta';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = TASK_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot={status === 'IN_PROGRESS'}>
      {meta.label}
    </Badge>
  );
}

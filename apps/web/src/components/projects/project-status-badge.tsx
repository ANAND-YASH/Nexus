import type { ProjectStatus } from '@nexus/types';
import { Badge } from '@nexus/ui';
import { PROJECT_STATUS_META } from '@/lib/projects/progress';

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot={status === 'ACTIVE'}>
      {meta.label}
    </Badge>
  );
}

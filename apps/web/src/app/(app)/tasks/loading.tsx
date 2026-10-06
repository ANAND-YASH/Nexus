import { Skeleton } from '@nexus/ui';
import { TaskListSkeleton } from '@/components/tasks/task-list';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-96 max-w-[60%]" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <TaskListSkeleton />
    </div>
  );
}

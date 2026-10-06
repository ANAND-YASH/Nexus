import { Card, LoadingState, Skeleton } from '@nexus/ui';

export default function Loading() {
  return (
    <LoadingState label="Loading project…">
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <Card className="p-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="mt-3 h-3 w-40" />
          <Skeleton className="mt-6 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </LoadingState>
  );
}

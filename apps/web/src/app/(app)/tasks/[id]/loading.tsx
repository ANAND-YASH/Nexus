import { Card, LoadingState, Skeleton } from '@nexus/ui';

export default function Loading() {
  return (
    <LoadingState label="Loading task…">
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2">
            <Skeleton className="h-6 w-72 max-w-full" />
            <Skeleton className="mt-3 h-5 w-48" />
            <Skeleton className="mt-8 h-4 w-full max-w-xl" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
          </Card>
          <Card className="space-y-4 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
      </div>
    </LoadingState>
  );
}

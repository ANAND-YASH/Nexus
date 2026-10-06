import { LoadingState, Skeleton } from '@nexus/ui';

export default function Loading() {
  return (
    <LoadingState label="Loading page…">
      <div className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </LoadingState>
  );
}

'use client';

import { RouteError } from '@/components/states/route-error';

export default function TaskError({ retry }: { retry: () => void }) {
  return <RouteError retry={retry} subject="this task" />;
}

'use client';

import { RouteError } from '@/components/states/route-error';

export default function ProjectsError({ retry }: { retry: () => void }) {
  return <RouteError retry={retry} subject="this project" />;
}

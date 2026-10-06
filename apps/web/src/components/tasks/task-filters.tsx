'use client';

import { SelectField } from '@nexus/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  DEFAULT_TASK_FILTERS,
  hasNarrowingFilters,
  TASK_SORTS,
  taskFiltersHref,
  type TaskFilters as Filters,
  type TaskSort,
} from '@/lib/tasks/filters';
import { TASK_PRIORITY_OPTIONS } from '@/lib/tasks/meta';
import type { TaskPriority } from '@nexus/types';
import type { ProjectOption } from '@/lib/tasks/project-options';

/**
 * Priority, project and sort pickers. Each change updates the URL, so
 * filtered views can be bookmarked and shared, and Back works.
 */
export function TaskFilters({
  filters,
  projects,
}: {
  filters: Filters;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (next: Partial<Filters>) =>
    startTransition(() => {
      router.push(taskFiltersHref({ ...filters, ...next }), { scroll: false });
    });

  return (
    <div
      className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap"
      aria-busy={pending || undefined}
    >
      <SelectField
        id="filter-priority"
        label="Priority"
        className="sm:w-36"
        value={filters.priority ?? ''}
        options={[
          { value: '', label: 'Any priority' },
          ...TASK_PRIORITY_OPTIONS,
        ]}
        onChange={(event) =>
          go({ priority: (event.target.value || null) as TaskPriority | null })
        }
      />
      <SelectField
        id="filter-project"
        label="Project"
        className="sm:w-48"
        value={filters.project ?? ''}
        options={[
          { value: '', label: 'Any project' },
          { value: 'none', label: 'No project' },
          ...projects.map((p) => ({
            value: p.id,
            label: p.status === 'ARCHIVED' ? `${p.name} (archived)` : p.name,
          })),
        ]}
        onChange={(event) => go({ project: event.target.value || null })}
      />
      <SelectField
        id="filter-sort"
        label="Sort by"
        className="col-span-2 sm:w-44"
        value={filters.sort}
        options={TASK_SORTS.map(({ value, label }) => ({ value, label }))}
        onChange={(event) => go({ sort: event.target.value as TaskSort })}
      />
      {(hasNarrowingFilters(filters) ||
        filters.sort !== DEFAULT_TASK_FILTERS.sort) && (
        <Link
          href={taskFiltersHref({
            ...DEFAULT_TASK_FILTERS,
            status: filters.status,
          })}
          scroll={false}
          className="col-span-2 mb-2 text-[13px] font-medium text-accent-text underline-offset-4 hover:underline"
        >
          Reset
        </Link>
      )}
    </div>
  );
}

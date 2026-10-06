import { Badge, Card, LoadingState, Skeleton } from '@nexus/ui';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  GoalsIcon,
  KnowledgeIcon,
  ProjectsIcon,
  TasksIcon,
  type IconProps,
} from '@/components/icons';
import {
  listContextEntities,
  listDocuments,
  listGoals,
  listProjects,
  listTasks,
} from '@/lib/api/workspace';
import { countBy, summarizeTasks } from '@/lib/dashboard';

function StatCard({
  href,
  label,
  value,
  icon: Icon,
  detail,
}: {
  href: string;
  label: string;
  value: number;
  icon: ComponentType<IconProps>;
  detail: ReactNode;
}) {
  return (
    <li>
      <Card className="group relative h-full p-4 transition-colors hover:border-border-strong">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-fg-muted">
            {/* Whole card is the link target; the heading names it. */}
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
            >
              {label}
            </Link>
          </h3>
          <Icon
            width={16}
            height={16}
            className="text-fg-subtle transition-colors group-hover:text-accent-text"
          />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-fg tabular-nums">
          {value}
        </p>
        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          {detail}
        </div>
      </Card>
    </li>
  );
}

export async function DashboardStats() {
  const [projects, tasks, goals, documents, entities] = await Promise.all([
    listProjects(),
    listTasks(),
    listGoals(),
    listDocuments(),
    listContextEntities(),
  ]);
  const taskSummary = summarizeTasks(tasks);
  const pausedGoals = countBy(goals, (goal) => goal.status === 'PAUSED');
  const completedGoals = countBy(goals, (goal) => goal.status === 'COMPLETED');

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        href="/tasks"
        label="Open tasks"
        value={taskSummary.open}
        icon={TasksIcon}
        detail={
          <>
            <span>{taskSummary.inProgress} in progress</span>
            {taskSummary.overdue > 0 && (
              <Badge tone="danger">{taskSummary.overdue} overdue</Badge>
            )}
          </>
        }
      />
      <StatCard
        href="/projects"
        label="Active projects"
        value={countBy(projects, (project) => project.status === 'ACTIVE')}
        icon={ProjectsIcon}
        detail={`${countBy(projects, (project) => project.status === 'COMPLETED')} completed`}
      />
      <StatCard
        href="/goals"
        label="Active goals"
        value={countBy(goals, (goal) => goal.status === 'ACTIVE')}
        icon={GoalsIcon}
        detail={`${completedGoals} completed · ${pausedGoals} paused`}
      />
      <StatCard
        href="/knowledge"
        label="Documents"
        value={documents.length}
        icon={KnowledgeIcon}
        detail={`${entities.length} context ${entities.length === 1 ? 'entity' : 'entities'}`}
      />
    </ul>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <LoadingState label="Loading workspace summary…">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>
    </LoadingState>
  );
}

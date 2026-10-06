import { Card, CardHeader, LoadingState, Skeleton } from '@nexus/ui';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { ArrowRightIcon } from '@/components/icons';
import { SectionBoundary } from '@/components/states/section-boundary';

/**
 * A card section that loads independently: its own skeleton while data
 * streams in and its own error state if that data fails.
 */
export function SectionPanel({
  id,
  title,
  description,
  href,
  action,
  subject,
  rows = 4,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  /** "View all" destination. */
  href?: string;
  /** Extra header control, e.g. a create button. */
  action?: ReactNode;
  /** Used in loading and error messages, e.g. "your tasks". */
  subject: string;
  /** Skeleton rows while loading. */
  rows?: number;
  className?: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <Card
      as="section"
      aria-labelledby={titleId}
      className={`flex min-w-0 flex-col ${className ?? ''}`}
    >
      <CardHeader
        title={title}
        titleId={titleId}
        description={description}
        action={
          (action || href) && (
            <div className="flex items-center gap-3">
              {action}
              {href && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  View all
                  <span className="sr-only"> {title.toLowerCase()}</span>
                  <ArrowRightIcon width={14} height={14} />
                </Link>
              )}
            </div>
          )
        }
      />
      <div className="flex-1">
        <SectionBoundary subject={subject}>
          <Suspense fallback={<PanelSkeleton rows={rows} subject={subject} />}>
            {children}
          </Suspense>
        </SectionBoundary>
      </div>
    </Card>
  );
}

function PanelSkeleton({ rows, subject }: { rows: number; subject: string }) {
  return (
    <LoadingState label={`Loading ${subject}…`}>
      <ul className="space-y-1 px-2 pb-3">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-14" />
          </li>
        ))}
      </ul>
    </LoadingState>
  );
}

/** List container used by panels: rows sit flush with the card edges. */
export function PanelList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border px-2 pb-2">{children}</ul>;
}

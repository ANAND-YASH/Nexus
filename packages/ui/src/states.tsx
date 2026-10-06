import type { ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './skeleton';

export interface StateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Decorative icon (rendered `aria-hidden`). */
  icon?: ReactNode;
  /** Call to action, e.g. a retry button or a link. */
  action?: ReactNode;
  /** `compact` fits inside a card; `page` fills a route. */
  size?: 'compact' | 'page';
  /** Heading level for the title; defaults to a paragraph. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
}

const iconTones = {
  neutral: 'bg-surface-muted text-fg-muted ring-border',
  accent: 'bg-accent-soft text-accent-text ring-accent/15',
  danger: 'bg-danger-soft text-danger ring-danger/15',
} as const;

function StateLayout({
  title,
  description,
  icon,
  action,
  size = 'compact',
  titleAs: Title = 'p',
  className,
  tone,
  role,
}: StateProps & {
  tone: keyof typeof iconTones;
  role?: 'alert' | 'status';
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center text-center',
        size === 'page' ? 'mx-auto max-w-md py-16 sm:py-24' : 'px-4 py-8',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden
          className={cn(
            'mb-4 flex items-center justify-center rounded-xl ring-1 ring-inset [&_svg]:size-5',
            size === 'page' ? 'size-12' : 'size-10',
            iconTones[tone],
          )}
        >
          {icon}
        </div>
      )}
      <Title
        className={cn(
          'font-semibold text-balance text-fg',
          size === 'page' ? 'text-lg' : 'text-sm',
        )}
      >
        {title}
      </Title>
      {description && (
        <p
          className={cn(
            'mt-1.5 max-w-sm text-pretty text-fg-muted',
            size === 'page' ? 'text-sm' : 'text-[13px]',
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/** Nothing to show yet — explains why and, ideally, what to do next. */
export function EmptyState(
  props: StateProps & { tone?: 'neutral' | 'accent' },
) {
  return <StateLayout {...props} tone={props.tone ?? 'neutral'} />;
}

/** Something failed. Announced to assistive tech. */
export function ErrorState(props: StateProps) {
  return <StateLayout {...props} tone="danger" role="alert" />;
}

export interface LoadingStateProps {
  /** Announced to assistive tech, and shown unless `visuallyHidden`. */
  label?: string;
  visuallyHidden?: boolean;
  className?: string;
  /** Optional skeleton shown in place of the spinner. */
  children?: ReactNode;
}

export function LoadingState({
  label = 'Loading…',
  visuallyHidden = false,
  className,
  children,
}: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      {children ?? (
        <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-fg-muted">
          <Spinner />
          {!visuallyHidden && <span>{label}</span>}
        </div>
      )}
      {(children || visuallyHidden) && <span className="sr-only">{label}</span>}
    </div>
  );
}

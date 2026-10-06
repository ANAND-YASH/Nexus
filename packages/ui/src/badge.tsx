import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Leading status dot, for states rather than categories. */
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted ring-border',
  accent: 'bg-accent-soft text-accent-text ring-accent/15',
  success: 'bg-success-soft text-success ring-success/15',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/15',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-2xs font-medium whitespace-nowrap ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

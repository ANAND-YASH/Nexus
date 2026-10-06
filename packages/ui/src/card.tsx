import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type CardProps = HTMLAttributes<HTMLElement> & {
  /** Render as a landmark `section` (give it `aria-labelledby`). */
  as?: 'div' | 'section' | 'article';
};

export function Card({
  as: Component = 'div',
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Id for the title, so a `section` card can reference it. */
  titleId?: string;
  description?: ReactNode;
  /** Trailing content, e.g. a "View all" link. */
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  titleId,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 px-5 pt-4 pb-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={titleId} className="text-sm font-semibold text-fg">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

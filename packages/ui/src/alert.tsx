import type { ReactNode } from 'react';
import { cn } from './cn';

export interface AlertProps {
  children: ReactNode;
  /** Decorative leading icon. */
  icon?: ReactNode;
  className?: string;
}

/** Inline error message, announced immediately to assistive tech. */
export function Alert({ children, icon, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-2.5 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger ring-1 ring-danger/15 ring-inset [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

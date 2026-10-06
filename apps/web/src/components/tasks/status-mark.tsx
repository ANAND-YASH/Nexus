import type { TaskStatus } from '@nexus/types';
import { cn } from '@nexus/ui';

/** Decorative status glyph; always pair it with the status in text. */
export function StatusMark({ status }: { status: TaskStatus }) {
  if (status === 'COMPLETED') {
    return (
      <span
        aria-hidden
        className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-success text-surface"
      >
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
          <path
            d="m3 6.2 2 1.9L9 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'size-3.5 shrink-0 rounded-full border-2',
        status === 'IN_PROGRESS' &&
          'border-accent bg-[conic-gradient(var(--color-accent)_50%,transparent_0)]',
        status === 'TODO' && 'border-border-strong',
        status === 'CANCELLED' && 'border-dashed border-border-strong',
      )}
    />
  );
}

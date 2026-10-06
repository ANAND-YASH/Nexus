import type { TaskPriority } from '@nexus/types';
import { cn } from '@nexus/ui';
import { TASK_PRIORITY_META } from '@/lib/tasks/meta';

const LEVEL_COLOR = {
  1: 'text-fg-subtle',
  2: 'text-fg-muted',
  3: 'text-warning',
  4: 'text-danger',
} as const;

/**
 * Signal bars plus the priority's name, so it reads without color. Only
 * High and Urgent get color; the rest stay quiet.
 */
export function PriorityIndicator({
  priority,
  hideLabel = false,
  className,
}: {
  priority: TaskPriority;
  /** Keep the name for screen readers only (it's still announced). */
  hideLabel?: boolean;
  className?: string;
}) {
  const { label, level } = TASK_PRIORITY_META[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs whitespace-nowrap',
        LEVEL_COLOR[level],
        className,
      )}
    >
      <svg aria-hidden viewBox="0 0 14 12" className="h-3 w-3.5 shrink-0">
        {[0, 1, 2, 3].map((bar) => (
          <rect
            key={bar}
            x={bar * 3.5}
            y={9 - bar * 3}
            width="2.25"
            height={3 + bar * 3}
            rx="0.75"
            fill="currentColor"
            opacity={bar < level ? 1 : 0.22}
          />
        ))}
      </svg>
      <span className={hideLabel ? 'sr-only' : undefined}>
        {hideLabel ? `${label} priority` : label}
      </span>
    </span>
  );
}

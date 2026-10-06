import { cn } from './cn';

export interface ProgressProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Tasks completed". */
  label: string;
  /** Spoken value, e.g. "3 of 5 tasks done". Defaults to a percentage. */
  valueText?: string;
  className?: string;
}

/** Thin determinate progress bar. */
export function Progress({
  value,
  max,
  label,
  valueText,
  className,
}: ProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ?? `${percent}%`}
      className={cn(
        'h-1.5 overflow-hidden rounded-full bg-surface-muted',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

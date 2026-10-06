import { cn } from './cn';

export interface AvatarProps {
  /** Name or email the initials are derived from. */
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

function initials(name: string): string {
  const base = name.split('@')[0] ?? name;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : base.slice(0, 2);
  return letters.toUpperCase() || '?';
}

/** Initials avatar. Decorative: always pair it with the visible name. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-text ring-1 ring-accent/15 ring-inset',
        size === 'sm' ? 'size-7 text-2xs' : 'size-8 text-xs',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

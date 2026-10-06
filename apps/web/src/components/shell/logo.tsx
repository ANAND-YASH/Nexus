import { cn } from '@nexus/ui';

/** NEXUS mark: three linked nodes — context connecting your work. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-xs',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none">
        <path
          d="M7 7.5 16.5 6M7 7.5l5 10M16.5 6 12 17.5"
          stroke="currentColor"
          strokeOpacity="0.7"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="7" cy="7.5" r="2.4" fill="currentColor" />
        <circle cx="16.5" cy="6" r="2.4" fill="currentColor" />
        <circle cx="12" cy="17.5" r="2.4" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ collapsible = false }: { collapsible?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span
        className={cn(
          'text-[15px] font-semibold tracking-[0.14em] text-fg',
          // In the tablet rail only the mark shows.
          collapsible && 'md:max-lg:sr-only',
        )}
      >
        NEXUS
      </span>
    </span>
  );
}

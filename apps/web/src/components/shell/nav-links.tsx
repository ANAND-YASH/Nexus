'use client';

import { cn } from '@nexus/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isActive,
  PRIMARY_NAV,
  SETTINGS_NAV,
  type NavItem,
} from '@/lib/navigation';

interface NavLinksProps {
  /** `rail` collapses to icons on tablet widths; `drawer` always shows labels. */
  variant: 'rail' | 'drawer';
  onNavigate?: () => void;
}

function NavLink({
  item,
  active,
  variant,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  variant: NavLinksProps['variant'];
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const rail = variant === 'rail';

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
          rail && 'md:max-lg:size-10 md:max-lg:justify-center md:max-lg:px-0',
          active
            ? 'bg-surface text-fg shadow-xs ring-1 ring-border'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )}
      >
        <Icon
          width={16}
          height={16}
          className={cn(
            'shrink-0 transition-colors',
            active
              ? 'text-accent-text'
              : 'text-fg-subtle group-hover:text-fg-muted',
          )}
        />
        <span className={cn('truncate', rail && 'md:max-lg:sr-only')}>
          {item.label}
        </span>
        {rail && (
          // Tablet rail tooltip; the real name is the sr-only label above.
          <span
            aria-hidden
            className="pointer-events-none absolute left-full z-20 ml-2 hidden rounded-md bg-fg px-2 py-1 text-xs whitespace-nowrap text-canvas opacity-0 shadow-overlay transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:max-lg:block"
          >
            {item.label}
          </span>
        )}
      </Link>
    </li>
  );
}

export function NavLinks({ variant, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const rail = variant === 'rail';

  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto">
        {PRIMARY_NAV.map((group) => (
          <div key={group.label}>
            <p
              className={cn(
                'mb-1 px-2.5 text-2xs font-medium tracking-wide text-fg-subtle uppercase',
                rail && 'md:max-lg:sr-only',
              )}
            >
              {group.label}
            </p>
            <ul
              className={cn(
                'space-y-0.5',
                rail &&
                  'md:max-lg:flex md:max-lg:flex-col md:max-lg:items-center',
              )}
            >
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href, pathname)}
                  variant={variant}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul
        className={cn(
          'mt-4 border-t border-border pt-3',
          rail && 'md:max-lg:flex md:max-lg:flex-col md:max-lg:items-center',
        )}
      >
        <NavLink
          item={SETTINGS_NAV}
          active={isActive(SETTINGS_NAV.href, pathname)}
          variant={variant}
          onNavigate={onNavigate}
        />
      </ul>
    </nav>
  );
}

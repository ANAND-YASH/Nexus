import { Avatar, Skeleton } from '@nexus/ui';
import { unstable_rethrow } from 'next/navigation';
import { ChevronDownIcon, SettingsIcon, SignOutIcon } from '@/components/icons';
import { signOut } from '@/lib/auth/actions';
import { getCurrentUser } from '@/lib/auth/session';
import { PopoverLink } from './popover-link';
import { ThemeSwitcher } from './theme-switcher';

const MENU_ID = 'nexus-user-menu';

const itemClasses =
  'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg [&_svg]:text-fg-subtle';

/**
 * Account menu on the native Popover API: light dismiss, Escape and focus
 * return come from the browser, so this stays a Server Component.
 */
export async function UserMenu() {
  // The shell must keep working when the API is down; the page's own error
  // state explains the outage. Redirects (expired session) still apply.
  let email: string | null = null;
  try {
    email = (await getCurrentUser()).email;
  } catch (error) {
    unstable_rethrow(error);
  }
  const name = email ?? 'Account';

  return (
    <>
      <button
        type="button"
        popoverTarget={MENU_ID}
        aria-label={email ? `Account menu for ${email}` : 'Account menu'}
        className="flex h-9 items-center gap-2 rounded-lg pr-1.5 pl-1 text-[13px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
      >
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-48 truncate sm:block">{name}</span>
        <ChevronDownIcon width={14} height={14} className="text-fg-subtle" />
      </button>

      <div
        id={MENU_ID}
        popover="auto"
        className="inset-auto top-14 right-3 m-0 w-72 rounded-xl border border-border bg-surface-raised p-1.5 text-fg shadow-overlay sm:right-4"
      >
        <div className="flex items-center gap-3 px-2 pt-1.5 pb-3">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-fg">{name}</p>
            <p className="text-xs text-fg-subtle">
              {email ? 'Personal workspace' : 'Account details unavailable'}
            </p>
          </div>
        </div>
        <div className="border-t border-border px-2 py-3">
          <ThemeSwitcher />
        </div>
        <div className="border-t border-border pt-1.5">
          <PopoverLink
            href="/settings"
            popoverId={MENU_ID}
            className={itemClasses}
          >
            <SettingsIcon />
            Settings
          </PopoverLink>
          <form action={signOut}>
            <button type="submit" className={itemClasses}>
              <SignOutIcon />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex h-9 items-center gap-2 pl-1" aria-hidden>
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="hidden h-3.5 w-32 sm:block" />
    </div>
  );
}

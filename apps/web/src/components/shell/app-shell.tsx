import { Suspense, type ReactNode } from 'react';
import { MobileNav } from './mobile-nav';
import { OfflineBanner } from './offline-banner';
import { PageTitle } from './page-title';
import { Sidebar } from './sidebar';
import { UserMenu, UserMenuSkeleton } from './user-menu';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-surface-raised px-3 py-2 text-sm font-medium text-fg shadow-overlay transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
          <MobileNav />
          <PageTitle />
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <OfflineBanner />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

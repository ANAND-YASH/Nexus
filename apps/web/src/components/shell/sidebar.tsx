import Link from 'next/link';
import { Logo } from './logo';
import { NavLinks } from './nav-links';

/** Persistent navigation: icon rail on tablets, full sidebar on desktop. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-canvas px-3 pt-3 pb-4 md:flex md:w-16 lg:w-60">
      <Link
        href="/"
        aria-label="NEXUS dashboard"
        className="mb-6 flex h-10 items-center rounded-lg px-2 md:max-lg:justify-center md:max-lg:px-0"
      >
        <Logo collapsible />
      </Link>
      <NavLinks variant="rail" />
    </aside>
  );
}

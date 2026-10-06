'use client';

import { Button, Dialog } from '@nexus/ui';
import { useEffect, useState } from 'react';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { Logo } from './logo';
import { NavLinks } from './nav-links';

/** Below the `md` breakpoint the sidebar becomes a modal drawer. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // The drawer is mobile-only: close it if the viewport grows past `md`,
  // otherwise an invisible modal would leave the page inert.
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia('(min-width: 48rem)');
    const onChange = () => desktop.matches && setOpen(false);
    desktop.addEventListener('change', onChange);
    return () => desktop.removeEventListener('change', onChange);
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 md:hidden"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon width={18} height={18} />
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Navigation"
        hideTitle
        placement="start"
        className="md:hidden"
      >
        <div className="flex h-full flex-col px-3 pt-3 pb-4">
          <div className="mb-6 flex h-10 items-center justify-between pl-2">
            <Logo />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              onClick={close}
            >
              <CloseIcon width={18} height={18} />
            </Button>
          </div>
          <NavLinks variant="drawer" onNavigate={close} />
        </div>
      </Dialog>
    </>
  );
}

'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/** A link inside a popover that closes it on client-side navigation. */
export function PopoverLink({
  popoverId,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { popoverId: string }) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        document.getElementById(popoverId)?.hidePopover();
        onClick?.(event);
      }}
    />
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { findNavItem } from '@/lib/navigation';

/** The current section's name, as the page's top-level heading. */
export function PageTitle() {
  const item = findNavItem(usePathname());
  return (
    <h1 className="truncate text-[15px] font-semibold text-fg">
      {item?.label ?? 'NEXUS'}
    </h1>
  );
}

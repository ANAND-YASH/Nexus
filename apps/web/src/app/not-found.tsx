import { buttonClasses, EmptyState } from '@nexus/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { InboxIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        size="page"
        titleAs="h1"
        icon={<InboxIcon />}
        title="This page doesn’t exist"
        description="The link may be broken, or the page may have moved."
        action={
          <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
            Back to dashboard
          </Link>
        }
      />
    </main>
  );
}

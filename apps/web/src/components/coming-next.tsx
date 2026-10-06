import { Badge, buttonClasses, Card } from '@nexus/ui';
import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons';
import type { NavItem } from '@/lib/navigation';

/** Intentional placeholder for sections that are designed but not built. */
export function ComingNext({ item }: { item: NavItem }) {
  const Icon = item.icon;

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/8 blur-3xl"
      />
      <div className="relative flex flex-col items-start gap-5 p-6 sm:p-10">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-text ring-1 ring-accent/15 ring-inset">
          <Icon width={22} height={22} />
        </span>
        <div className="max-w-xl">
          <Badge tone="accent">Coming next</Badge>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-balance text-fg">
            {item.label} is on its way
          </h2>
          <p className="mt-2 text-sm leading-6 text-pretty text-fg-muted">
            {item.summary}
          </p>
        </div>
        <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
          Back to dashboard
          <ArrowRightIcon />
        </Link>
      </div>
    </Card>
  );
}

import type { ReactNode } from 'react';

/** Lead-in under the top bar's page title: a description and page actions. */
export function PageIntro({
  description,
  actions,
}: {
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-sm text-fg-muted">{description}</p>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

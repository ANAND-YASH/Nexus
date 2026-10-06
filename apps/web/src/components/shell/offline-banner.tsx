'use client';

import { useSyncExternalStore } from 'react';
import { OfflineIcon } from '@/components/icons';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Announces lost connectivity; disappears once the browser is back online. */
export function OfflineBanner() {
  const online = useOnline();

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <div className="flex items-center gap-2.5 border-b border-warning/20 bg-warning-soft px-4 py-2 text-[13px] text-warning sm:px-6">
          <OfflineIcon width={16} height={16} className="shrink-0" />
          <p>
            <span className="font-semibold">You’re offline.</span> What’s on
            screen may be out of date until your connection returns.
          </p>
        </div>
      )}
    </div>
  );
}

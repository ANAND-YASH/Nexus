'use client';

import { Button, ErrorState } from '@nexus/ui';
import { AlertIcon, OfflineIcon } from '@/components/icons';
import { useOnline } from '@/components/shell/offline-banner';

/**
 * Shared fallback for failed loads. Server error details never reach the
 * browser in production, so the copy stays generic — unless the browser
 * itself is offline, which we can tell for certain.
 */
export function RouteError({
  retry,
  subject = 'this page',
  size = 'page',
}: {
  retry: () => void;
  subject?: string;
  size?: 'page' | 'compact';
}) {
  const online = useOnline();
  const titleAs = size === 'page' ? 'h2' : 'p';
  const action = (
    <Button
      variant="secondary"
      size={size === 'page' ? 'md' : 'sm'}
      onClick={retry}
    >
      Try again
    </Button>
  );

  return online ? (
    <ErrorState
      size={size}
      titleAs={titleAs}
      icon={<AlertIcon />}
      title={`We couldn’t load ${subject}`}
      description="NEXUS didn’t respond as expected. This is usually temporary."
      action={action}
    />
  ) : (
    <ErrorState
      size={size}
      titleAs={titleAs}
      icon={<OfflineIcon />}
      title="You’re offline"
      description={`Reconnect to load ${subject}.`}
      action={action}
    />
  );
}

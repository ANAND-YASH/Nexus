import type { Metadata } from 'next';
import { ComingNext } from '@/components/coming-next';
import { navItem } from '@/lib/navigation';

const item = navItem('/settings');

export const metadata: Metadata = { title: item.label };

export default function SettingsPage() {
  return <ComingNext item={item} />;
}

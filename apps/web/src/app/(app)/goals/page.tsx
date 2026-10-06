import type { Metadata } from 'next';
import { ComingNext } from '@/components/coming-next';
import { navItem } from '@/lib/navigation';

const item = navItem('/goals');

export const metadata: Metadata = { title: item.label };

export default function GoalsPage() {
  return <ComingNext item={item} />;
}

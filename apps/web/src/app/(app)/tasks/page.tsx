import type { Metadata } from 'next';
import { ComingNext } from '@/components/coming-next';
import { navItem } from '@/lib/navigation';

const item = navItem('/tasks');

export const metadata: Metadata = { title: item.label };

export default function TasksPage() {
  return <ComingNext item={item} />;
}

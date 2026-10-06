import type { Metadata } from 'next';
import { ComingNext } from '@/components/coming-next';
import { navItem } from '@/lib/navigation';

const item = navItem('/knowledge');

export const metadata: Metadata = { title: item.label };

export default function KnowledgePage() {
  return <ComingNext item={item} />;
}

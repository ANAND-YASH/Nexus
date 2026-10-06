import type { Metadata } from 'next';
import { ComingNext } from '@/components/coming-next';
import { navItem } from '@/lib/navigation';

const item = navItem('/context');

export const metadata: Metadata = { title: item.label };

export default function ContextPage() {
  return <ComingNext item={item} />;
}

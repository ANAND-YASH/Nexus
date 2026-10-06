import { Badge, Card, EmptyState } from '@nexus/ui';
import { InsightsIcon } from '@/components/icons';

/**
 * There is no cross-document insights endpoint yet (analysis is per
 * document), so this is an honest empty state rather than sample content.
 */
export function InsightsPlaceholder() {
  return (
    <Card as="section" aria-labelledby="insights-title">
      <div className="flex items-center justify-between gap-4 px-5 pt-4">
        <h2 id="insights-title" className="text-sm font-semibold text-fg">
          Insights
        </h2>
        <Badge tone="accent">Coming next</Badge>
      </div>
      <EmptyState
        tone="accent"
        icon={<InsightsIcon />}
        title="No insights to show yet"
        description="Insights will bring together AI analyses of your documents — summaries, action items and suggested connections — in one feed."
      />
    </Card>
  );
}

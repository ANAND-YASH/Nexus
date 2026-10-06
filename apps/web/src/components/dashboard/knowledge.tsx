import type { DocumentSourceType } from '@nexus/types';
import { Badge, EmptyState } from '@nexus/ui';
import { KnowledgeIcon } from '@/components/icons';
import { LocalDate } from '@/components/local-date';
import { listDocuments } from '@/lib/api/workspace';
import { recentDocuments } from '@/lib/dashboard';
import { PanelList } from '@/components/section-panel';

const LIMIT = 5;

const SOURCE_LABELS: Record<DocumentSourceType, string> = {
  MANUAL: 'Note',
  UPLOAD: 'Upload',
  IMPORT: 'Import',
  URL: 'Web',
};

export async function RecentKnowledge() {
  const documents = recentDocuments(await listDocuments(), LIMIT);

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<KnowledgeIcon />}
        title="No documents yet"
        description="Notes, uploads and saved pages you add to NEXUS will appear here."
      />
    );
  }

  return (
    <PanelList>
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-3 px-3 py-2.5">
          <KnowledgeIcon
            width={16}
            height={16}
            className="shrink-0 text-fg-subtle"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-fg">
              {document.title}
            </p>
            <p className="truncate text-xs text-fg-subtle">
              Added <LocalDate value={document.createdAt} />
              {' · '}
              <span className="font-mono text-2xs">{document.mimeType}</span>
            </p>
          </div>
          <Badge>{SOURCE_LABELS[document.sourceType]}</Badge>
        </li>
      ))}
    </PanelList>
  );
}

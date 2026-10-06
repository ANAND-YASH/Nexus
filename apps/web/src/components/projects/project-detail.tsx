import type {
  ContextEntityType,
  ContextResponse,
  DocumentSourceType,
  RelationshipType,
  TaskResponse,
} from '@nexus/types';
import { Badge, EmptyState, Progress } from '@nexus/ui';
import { ContextIcon, KnowledgeIcon, TasksIcon } from '@/components/icons';
import { LocalDate } from '@/components/local-date';
import { PanelList } from '@/components/section-panel';
import { TaskRow } from '@/components/tasks/task-row';
import { getProjectContext, listProjectTasks } from '@/lib/api/projects';
import { upNext } from '@/lib/tasks/order';
import { progressLabel, taskProgress } from '@/lib/projects/progress';

const CLOSED_LIMIT = 10;

/** Open tasks first (soonest due), then recently closed ones. */
function orderTasks(tasks: TaskResponse[]) {
  const open = upNext(tasks, tasks.length);
  const closed = tasks
    .filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED')
    .sort(
      (a, b) =>
        Date.parse(b.completedAt ?? b.updatedAt) -
        Date.parse(a.completedAt ?? a.updatedAt),
    );
  return { open, closed };
}

export async function ProjectTasks({ projectId }: { projectId: string }) {
  const tasks = await listProjectTasks(projectId);
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<TasksIcon />}
        title="No tasks in this project"
        description="Tasks assigned to this project will appear here with their status, priority and due date."
      />
    );
  }

  const progress = taskProgress(tasks);
  const { open, closed } = orderTasks(tasks);
  const shownClosed = closed.slice(0, CLOSED_LIMIT);

  return (
    <div>
      <div className="px-5 pb-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <span className="font-medium text-fg tabular-nums">
            {progressLabel(progress)}
          </span>
          <span className="text-fg-muted tabular-nums">
            {progress.open} open · {progress.inProgress} in progress
            {progress.cancelled > 0 && ` · ${progress.cancelled} cancelled`}
          </span>
        </div>
        <Progress
          value={progress.completed}
          max={progress.total}
          label="Project task progress"
          valueText={progressLabel(progress)}
        />
      </div>
      <PanelList>
        {open.map(({ task }) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {shownClosed.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </PanelList>
      {closed.length > CLOSED_LIMIT && (
        <p className="px-5 pb-4 text-xs text-fg-subtle">
          Showing the {CLOSED_LIMIT} most recently closed of {closed.length}{' '}
          closed tasks.
        </p>
      )}
    </div>
  );
}

const SOURCE_LABELS: Record<DocumentSourceType, string> = {
  MANUAL: 'Note',
  UPLOAD: 'Upload',
  IMPORT: 'Import',
  URL: 'Web',
};

function TruncatedNote({ context }: { context: ContextResponse }) {
  return context.truncated ? (
    <p className="px-5 pb-4 text-xs text-fg-subtle">
      This project has more connections than can be shown here.
    </p>
  ) : null;
}

export async function ProjectDocuments({ projectId }: { projectId: string }) {
  const context = await getProjectContext(projectId);
  const documents = context.related.documents;

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<KnowledgeIcon />}
        title="No linked documents"
        description="Documents linked to this project will be listed here."
      />
    );
  }

  return (
    <>
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
              </p>
            </div>
            <Badge>{SOURCE_LABELS[document.sourceType]}</Badge>
          </li>
        ))}
      </PanelList>
      <TruncatedNote context={context} />
    </>
  );
}

const ENTITY_TYPE_LABELS: Record<ContextEntityType, string> = {
  PERSON: 'Person',
  ORGANIZATION: 'Organization',
  PROJECT: 'Project',
  TECHNOLOGY: 'Technology',
  LOCATION: 'Location',
  CONCEPT: 'Concept',
};

function humanize(type: RelationshipType): string {
  const text = type.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** How each related entity is connected to the project, per the graph. */
function entityRelations(context: ContextResponse, projectId: string) {
  const relations = new Map<string, string[]>();
  for (const rel of context.related.relationships) {
    const outgoing = rel.sourceType === 'PROJECT' && rel.sourceId === projectId;
    const entityId = outgoing
      ? rel.targetType === 'ENTITY' && rel.targetId
      : rel.sourceType === 'ENTITY' && rel.sourceId;
    if (!entityId) continue;
    const label = outgoing
      ? humanize(rel.relationshipType)
      : `${humanize(rel.relationshipType)} this`;
    relations.set(entityId, [...(relations.get(entityId) ?? []), label]);
  }
  return relations;
}

export async function ProjectContextEntities({
  projectId,
}: {
  projectId: string;
}) {
  const context = await getProjectContext(projectId);
  const entities = context.related.entities;

  if (entities.length === 0) {
    return (
      <EmptyState
        icon={<ContextIcon />}
        title="No context yet"
        description="People, technologies and topics connected to this project will appear here."
      />
    );
  }

  const relations = entityRelations(context, projectId);
  return (
    <>
      <PanelList>
        {entities.map((entity) => (
          <li key={entity.id} className="flex items-center gap-3 px-3 py-2.5">
            <ContextIcon
              width={16}
              height={16}
              className="shrink-0 text-accent-text"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg">
                {entity.name}
              </p>
              <p className="truncate text-xs text-fg-subtle">
                {(relations.get(entity.id) ?? ['Related']).join(' · ')}
              </p>
            </div>
            <Badge>{ENTITY_TYPE_LABELS[entity.type]}</Badge>
          </li>
        ))}
      </PanelList>
      <TruncatedNote context={context} />
    </>
  );
}

import { EmptyState } from '@nexus/ui';
import { TasksIcon } from '@/components/icons';
import { PanelList } from '@/components/section-panel';
import { TaskRow } from '@/components/tasks/task-row';
import { listProjects, listTasks } from '@/lib/api/workspace';
import { upNext } from '@/lib/dashboard';

const LIMIT = 6;

export async function UpNext() {
  const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
  const next = upNext(tasks, LIMIT);

  if (next.length === 0) {
    return (
      <EmptyState
        icon={<TasksIcon />}
        title={tasks.length === 0 ? 'No tasks yet' : 'Nothing open'}
        description={
          tasks.length === 0
            ? 'Tasks you create will line up here, soonest due first.'
            : 'Every task is completed or cancelled. Nice work.'
        }
      />
    );
  }

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  return (
    <PanelList>
      {next.map(({ task, overdue }) => (
        <TaskRow
          key={task.id}
          task={task}
          overdue={overdue}
          detail={task.projectId ? projectNames.get(task.projectId) : undefined}
        />
      ))}
    </PanelList>
  );
}

'use client';
import { useState } from 'react';
import { cn, fmt } from '@/lib/utils';
import type { Project, Task, TaskStatus, Priority, ActivityEvent } from '@/lib/planner/types';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProjectStatusPill, TaskStatusPill, PriorityPill } from './StatusPill';
import {
  Activity,
  CheckCircle2,
  Circle,
  CirclePause,
  ChevronRight,
  ListTodo,
  Pencil,
  Plus,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { useGameData } from '@/lib/data/use-data';

type Tab = 'tasks' | 'targets' | 'activity';

export function ProjectDetail({
  project,
  activity,
  onEdit,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onDeleteProject,
}: {
  project: Project | null;
  activity: ActivityEvent[];
  onEdit: (patch: Partial<Project>) => void;
  onAddTask: (text: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onDeleteProject: () => void;
}) {
  const [tab, setTab] = useState<Tab>('tasks');
  const [editing, setEditing] = useState(false);

  if (!project) {
    return (
      <div className="grid h-full place-items-center text-sm text-ficsit-subtle">
        Select a project on the left, or create a new one.
      </div>
    );
  }

  const total = project.tasks.length || 1;
  const done = project.tasks.filter((t) => t.status === 'done').length;
  const progress = Math.round((done / total) * 100);

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        project={project}
        editing={editing}
        onEdit={onEdit}
        onToggleEdit={() => setEditing((e) => !e)}
        onDeleteProject={onDeleteProject}
      />

      <div className="border-b border-ficsit-border bg-ficsit-bg/40 px-6">
        <div className="flex items-end gap-1">
          {(['tasks', 'targets', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm transition-colors',
                tab === t
                  ? 'border-ficsit-accent text-ficsit-text'
                  : 'border-transparent text-ficsit-subtle hover:text-ficsit-text',
              )}
            >
              <span className="inline-flex items-center gap-1.5 capitalize">
                {t === 'tasks' && <ListTodo className="h-3.5 w-3.5" />}
                {t === 'targets' && <Target className="h-3.5 w-3.5" />}
                {t === 'activity' && <Activity className="h-3.5 w-3.5" />}
                {t}
                {t === 'tasks' && (
                  <span className="ml-1 rounded bg-ficsit-panel2 px-1 text-[10px] text-ficsit-subtle">
                    {project.tasks.length}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'tasks' && (
          <TasksTab
            project={project}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        )}
        {tab === 'targets' && <TargetsTab project={project} onEdit={onEdit} />}
        {tab === 'activity' && (
          <ActivityTab activity={activity.filter((a) => a.projectId === project.id)} />
        )}
      </div>

      <div className="border-t border-ficsit-border bg-ficsit-bg/60 px-6 py-2.5">
        <div className="flex items-center justify-between text-xs text-ficsit-subtle">
          <span>
            {done}/{project.tasks.length} tasks complete · {progress}%
          </span>
          <div className="ml-4 flex-1">
            <div className="h-1 overflow-hidden rounded-full bg-ficsit-panel2">
              <div className="h-full bg-ficsit-accent transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectHeader({
  project,
  editing,
  onEdit,
  onToggleEdit,
  onDeleteProject,
}: {
  project: Project;
  editing: boolean;
  onEdit: (patch: Partial<Project>) => void;
  onToggleEdit: () => void;
  onDeleteProject: () => void;
}) {
  return (
    <div className="border-b border-ficsit-border bg-ficsit-bg/40 px-6 py-4">
      <div className="flex items-start gap-3">
        {project.targetItem && (
          <ItemIcon className={project.targetItem} size={56} cls="rounded-lg bg-ficsit-panel2 p-1.5" />
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              value={project.name}
              onChange={(e) => onEdit({ name: e.target.value })}
              className="text-xl"
            />
          ) : (
            <h2 className="text-xl font-semibold tracking-tight">{project.name}</h2>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProjectStatusPill status={project.status} />
            <span className="rounded-full border border-ficsit-border bg-ficsit-panel2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ficsit-subtle">
              Tier {project.tier}
            </span>
            {project.targetRatePerMin ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-ficsit-good/30 bg-ficsit-good/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ficsit-good">
                <Zap className="h-3 w-3" /> {fmt(project.targetRatePerMin)}/min
              </span>
            ) : null}
          </div>
          {editing ? (
            <textarea
              value={project.description}
              onChange={(e) => onEdit({ description: e.target.value })}
              rows={2}
              className="mt-2 w-full rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 py-1 text-sm"
            />
          ) : (
            project.description && (
              <p className="mt-2 max-w-3xl text-sm text-ficsit-subtle">{project.description}</p>
            )
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={onToggleEdit}>
            <Pencil className="h-3.5 w-3.5" /> {editing ? 'Done' : 'Edit'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeleteProject} title="Delete project">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const TASK_GROUPS: { status: TaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { status: 'doing', label: 'In Progress', icon: ChevronRight },
  { status: 'blocked', label: 'Blocked', icon: CirclePause },
  { status: 'todo', label: 'To Do', icon: Circle },
  { status: 'done', label: 'Done', icon: CheckCircle2 },
];

function TasksTab({
  project,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  project: Project;
  onAddTask: (text: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-ficsit-border bg-ficsit-panel p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              onAddTask(text.trim());
              setText('');
            }
          }}
        />
        <Button
          onClick={() => {
            if (!text.trim()) return;
            onAddTask(text.trim());
            setText('');
          }}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {TASK_GROUPS.map(({ status, label, icon: Icon }) => {
        const items = project.tasks.filter((t) => t.status === status);
        if (items.length === 0) return null;
        return (
          <section key={status}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-ficsit-subtle">
              <Icon className="h-3.5 w-3.5" /> {label}
              <span className="rounded bg-ficsit-panel2 px-1 text-[10px]">{items.length}</span>
            </div>
            <ul className="space-y-1.5">
              {items.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onUpdate={(patch) => onUpdateTask(t.id, patch)}
                  onDelete={() => onDeleteTask(t.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'doing',
  doing: 'done',
  blocked: 'doing',
  done: 'todo',
};

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md border border-ficsit-border bg-ficsit-panel px-2.5 py-2 transition-colors hover:border-ficsit-accent/40">
      <button
        onClick={() => onUpdate({ status: NEXT_STATUS[task.status] })}
        className="rounded p-1 text-ficsit-subtle hover:bg-ficsit-panel2 hover:text-ficsit-accent"
        title="Cycle status"
      >
        {task.status === 'done' ? (
          <CheckCircle2 className="h-4 w-4 text-ficsit-good" />
        ) : task.status === 'blocked' ? (
          <CirclePause className="h-4 w-4 text-ficsit-bad" />
        ) : task.status === 'doing' ? (
          <ChevronRight className="h-4 w-4 text-sky-300" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>
      <input
        value={task.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        className={cn(
          'flex-1 bg-transparent text-sm focus:outline-none',
          task.status === 'done' && 'line-through text-ficsit-subtle',
        )}
      />
      <select
        value={task.priority}
        onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
        className="h-7 rounded border border-ficsit-border bg-ficsit-panel2 px-1.5 text-[11px]"
        aria-label="Priority"
      >
        <option value="low">low</option>
        <option value="med">med</option>
        <option value="high">high</option>
      </select>
      <select
        value={task.status}
        onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
        className="h-7 rounded border border-ficsit-border bg-ficsit-panel2 px-1.5 text-[11px]"
        aria-label="Status"
      >
        <option value="todo">todo</option>
        <option value="doing">doing</option>
        <option value="blocked">blocked</option>
        <option value="done">done</option>
      </select>
      <button
        onClick={onDelete}
        className="rounded p-1 text-ficsit-subtle opacity-0 transition-opacity hover:bg-ficsit-panel2 hover:text-ficsit-bad group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function TargetsTab({ project, onEdit }: { project: Project; onEdit: (patch: Partial<Project>) => void }) {
  const { data } = useGameData();
  const items = data ? Object.values(data.items).sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ficsit-border bg-ficsit-panel p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ficsit-subtle">
          <Target className="h-3.5 w-3.5" /> Production Target
        </div>
        <div className="mt-3 grid grid-cols-[60px_1fr_140px] items-center gap-3">
          {project.targetItem ? (
            <ItemIcon className={project.targetItem} size={56} cls="rounded-md bg-ficsit-panel2 p-1" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-md bg-ficsit-panel2 text-ficsit-subtle">
              —
            </div>
          )}
          <select
            value={project.targetItem ?? ''}
            onChange={(e) => onEdit({ targetItem: e.target.value || undefined })}
            className="h-9 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 text-sm"
          >
            <option value="">— no target —</option>
            {items.map((it) => (
              <option key={it.className} value={it.className}>{it.name}</option>
            ))}
          </select>
          <div className="relative">
            <Input
              type="number"
              min={0}
              step="any"
              value={project.targetRatePerMin ?? ''}
              placeholder="rate"
              onChange={(e) =>
                onEdit({ targetRatePerMin: e.target.value ? Number(e.target.value) : undefined })
              }
              className="pr-12 text-right font-mono"
            />
            <span className="pointer-events-none absolute right-2 top-2 text-[10px] uppercase text-ficsit-subtle">
              /min
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-ficsit-subtle">
          Drop a target here and the Calculator can later seed itself from this row.
        </p>
      </div>

      <div className="rounded-lg border border-ficsit-border bg-ficsit-panel p-4">
        <div className="text-xs uppercase tracking-widest text-ficsit-subtle">Lifecycle</div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['planning', 'active', 'paused', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onEdit({ status: s })}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm capitalize transition-colors',
                project.status === s
                  ? 'border-ficsit-accent/60 bg-ficsit-accent/10 text-ficsit-accent'
                  : 'border-ficsit-border bg-ficsit-panel2 text-ficsit-text hover:border-ficsit-accent/40',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-ficsit-border bg-ficsit-panel p-4">
        <div className="text-xs uppercase tracking-widest text-ficsit-subtle">Tier</div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i}
              onClick={() => onEdit({ tier: i })}
              className={cn(
                'rounded-md border px-2 py-1.5 text-sm font-mono transition-colors',
                project.tier === i
                  ? 'border-ficsit-accent/60 bg-ficsit-accent/10 text-ficsit-accent'
                  : 'border-ficsit-border bg-ficsit-panel2 text-ficsit-subtle hover:border-ficsit-accent/40',
              )}
            >
              T{i}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityEvent[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-ficsit-subtle">No activity recorded yet for this project.</p>;
  }
  return (
    <ol className="relative ml-3 border-l border-ficsit-border">
      {activity.map((a) => (
        <li key={a.id} className="mb-4 ml-4">
          <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-ficsit-accent" />
          <time className="text-[10px] uppercase tracking-wide text-ficsit-subtle">
            {new Date(a.at).toLocaleString()}
          </time>
          <div className="text-sm">{a.message}</div>
        </li>
      ))}
    </ol>
  );
}

export { TaskStatusPill, PriorityPill };

import { cn } from '@/lib/utils';
import type { ProjectStatus, TaskStatus, Priority } from '@/lib/planner/types';

const PROJECT_TONES: Record<ProjectStatus, string> = {
  planning: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  active: 'bg-ficsit-good/15 text-ficsit-good border-ficsit-good/40',
  paused: 'bg-ficsit-warn/15 text-ficsit-warn border-ficsit-warn/40',
  done: 'bg-ficsit-subtle/15 text-ficsit-subtle border-ficsit-subtle/40',
};

const TASK_TONES: Record<TaskStatus, string> = {
  todo: 'bg-ficsit-subtle/15 text-ficsit-subtle border-ficsit-subtle/40',
  doing: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  blocked: 'bg-ficsit-bad/15 text-ficsit-bad border-ficsit-bad/40',
  done: 'bg-ficsit-good/15 text-ficsit-good border-ficsit-good/40',
};

const PRIORITY_TONES: Record<Priority, string> = {
  low: 'bg-ficsit-panel2 text-ficsit-subtle border-ficsit-border',
  med: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  high: 'bg-ficsit-bad/15 text-ficsit-bad border-ficsit-bad/40',
};

const STATUS_DOT: Record<ProjectStatus | TaskStatus, string> = {
  planning: 'bg-sky-400',
  active: 'bg-ficsit-good',
  paused: 'bg-ficsit-warn',
  done: 'bg-ficsit-good',
  todo: 'bg-ficsit-subtle',
  doing: 'bg-sky-400',
  blocked: 'bg-ficsit-bad',
};

export function ProjectStatusPill({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        PROJECT_TONES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status], status === 'active' && 'animate-pulse')} />
      {status}
    </span>
  );
}

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        TASK_TONES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
      {status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        PRIORITY_TONES[priority],
      )}
    >
      {priority}
    </span>
  );
}

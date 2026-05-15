'use client';
import type { Project } from '@/lib/planner/types';
import { cn, fmt } from '@/lib/utils';
import { Activity, CheckCircle2, AlertTriangle, ListTodo, Boxes } from 'lucide-react';

export function KPIStrip({ projects }: { projects: Project[] }) {
  const tasks = projects.flatMap((p) => p.tasks);
  const totalTasks = tasks.length || 1;
  const done = tasks.filter((t) => t.status === 'done').length;
  const doing = tasks.filter((t) => t.status === 'doing').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const active = projects.filter((p) => p.status === 'active').length;

  const items: KPIItem[] = [
    {
      label: 'Projects',
      value: projects.length,
      sub: `${active} active`,
      icon: Boxes,
      tone: 'accent',
    },
    {
      label: 'Tasks',
      value: tasks.length,
      sub: 'across all projects',
      icon: ListTodo,
      tone: 'default',
    },
    {
      label: 'Complete',
      value: done,
      sub: `${Math.round((done / totalTasks) * 100)}%`,
      icon: CheckCircle2,
      tone: 'good',
      progress: done / totalTasks,
    },
    {
      label: 'In Progress',
      value: doing,
      sub: 'currently active',
      icon: Activity,
      tone: 'info',
    },
    {
      label: 'Blocked',
      value: blocked,
      sub: blocked > 0 ? 'needs attention' : 'none',
      icon: AlertTriangle,
      tone: blocked > 0 ? 'bad' : 'default',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((it) => (
        <KPITile key={it.label} {...it} />
      ))}
    </div>
  );
}

type Tone = 'default' | 'accent' | 'good' | 'info' | 'bad';

interface KPIItem {
  label: string;
  value: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  progress?: number;
}

const TONES: Record<Tone, string> = {
  default: 'text-ficsit-text',
  accent: 'text-ficsit-accent',
  good: 'text-ficsit-good',
  info: 'text-sky-300',
  bad: 'text-ficsit-bad',
};

const ICON_BG: Record<Tone, string> = {
  default: 'bg-ficsit-panel2 text-ficsit-subtle',
  accent: 'bg-ficsit-accent/15 text-ficsit-accent',
  good: 'bg-ficsit-good/15 text-ficsit-good',
  info: 'bg-sky-500/15 text-sky-300',
  bad: 'bg-ficsit-bad/15 text-ficsit-bad',
};

function KPITile({ label, value, sub, icon: Icon, tone, progress }: KPIItem) {
  return (
    <div className="rounded-lg border border-ficsit-border bg-ficsit-panel p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ficsit-subtle">{label}</div>
          <div className={cn('mt-1 font-mono text-2xl tabular-nums', TONES[tone])}>{fmt(value)}</div>
        </div>
        <div className={cn('grid h-8 w-8 place-items-center rounded-md', ICON_BG[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ficsit-subtle">
        <span>{sub}</span>
      </div>
      {progress != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ficsit-panel2">
          <div
            className="h-full bg-ficsit-good transition-[width]"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

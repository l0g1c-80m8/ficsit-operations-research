'use client';
import type { Project } from '@/lib/planner/types';
import { StatTile, type StatTone } from '@/components/ui/StatTile';
import { Activity, AlertTriangle, Boxes, CheckCircle2, ListTodo } from 'lucide-react';

export function KPIStrip({ projects }: { projects: Project[] }) {
  const tasks = projects.flatMap((p) => p.tasks);
  const totalTasks = tasks.length || 1;
  const done = tasks.filter((t) => t.status === 'done').length;
  const doing = tasks.filter((t) => t.status === 'doing').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const active = projects.filter((p) => p.status === 'active').length;

  const items: {
    label: string;
    value: number;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: StatTone;
    progress?: number;
  }[] = [
    { label: 'Projects', value: projects.length, sub: `${active} active`, icon: Boxes, tone: 'accent' },
    { label: 'Tasks', value: tasks.length, sub: 'across all projects', icon: ListTodo, tone: 'default' },
    { label: 'Complete', value: done, sub: `${Math.round((done / totalTasks) * 100)}%`, icon: CheckCircle2, tone: 'good', progress: done / totalTasks },
    { label: 'In Progress', value: doing, sub: 'currently active', icon: Activity, tone: 'info' },
    { label: 'Blocked', value: blocked, sub: blocked > 0 ? 'needs attention' : 'none', icon: AlertTriangle, tone: blocked > 0 ? 'bad' : 'default' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((it) => (
        <StatTile key={it.label} {...it} compact />
      ))}
    </div>
  );
}

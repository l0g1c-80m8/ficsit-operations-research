'use client';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/planner/types';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { ProjectStatusPill } from './StatusPill';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useMemo, useState } from 'react';

export function ProjectList({
  projects,
  activeId,
  onSelect,
  onCreate,
}: {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
  }, [projects, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-ficsit-subtle" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="pl-8"
          />
        </div>
        <Button onClick={onCreate} size="sm" title="New project">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((p) => (
          <li key={p.id}>
            <ProjectRow project={p} active={p.id === activeId} onClick={() => onSelect(p.id)} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ficsit-subtle">No projects match.</li>
        )}
      </ul>
    </div>
  );
}

function ProjectRow({ project, active, onClick }: { project: Project; active: boolean; onClick: () => void }) {
  const total = project.tasks.length || 1;
  const done = project.tasks.filter((t) => t.status === 'done').length;
  const progress = done / total;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full rounded-md px-3 py-2.5 text-left transition-colors',
        active ? 'bg-ficsit-accent/10 ring-1 ring-ficsit-accent/40' : 'hover:bg-ficsit-panel2',
      )}
    >
      <div className="flex items-center gap-2">
        {project.targetItem ? (
          <ItemIcon className={project.targetItem} size={28} cls="rounded-md bg-ficsit-panel2 p-1" />
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-md bg-ficsit-panel2 text-xs text-ficsit-subtle">
            T{project.tier}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{project.name}</span>
            <span className="font-mono text-[10px] text-ficsit-subtle">T{project.tier}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <ProjectStatusPill status={project.status} />
            <span className="text-[10px] text-ficsit-subtle">
              {done}/{project.tasks.length} tasks
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ficsit-panel2">
        <div
          className="h-full bg-ficsit-accent transition-[width]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </button>
  );
}

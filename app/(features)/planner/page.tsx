'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  milestone: string;
  tasks: { id: string; text: string; done: boolean }[];
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Phase 1 — Iron Plate Foundry',
    milestone: 'Tier 1',
    tasks: [
      { id: 't1', text: 'Place 8 Miner Mk.1 on Northern Forest iron nodes', done: true },
      { id: 't2', text: 'Run 480 ore/min into Smelter array (8x at 100%)', done: true },
      { id: 't3', text: 'Build 8x Constructor for Iron Plate', done: false },
      { id: 't4', text: 'Belt to central storage hub', done: false },
    ],
  },
  {
    id: 'p2',
    name: 'Phase 2 — Aluminum',
    milestone: 'Tier 7',
    tasks: [
      { id: 't1', text: 'Survey Bauxite + Water near Spire Coast', done: false },
      { id: 't2', text: 'Determine Sloppy Alumina vs. standard alt', done: false },
    ],
  },
];

export default function PlannerPage() {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [name, setName] = useState('');

  const total = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const done = projects.reduce((acc, p) => acc + p.tasks.filter((t) => t.done).length, 0);

  return (
    <>
      <PageHeader
        title="Planner"
        subtitle={`${done} / ${total} tasks complete across ${projects.length} projects`}
      />
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader title="New Project" />
          <CardBody className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
            <Button
              onClick={() => {
                if (!name.trim()) return;
                setProjects((ps) => [
                  ...ps,
                  { id: crypto.randomUUID(), name, milestone: '—', tasks: [] },
                ]);
                setName('');
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onChange={(np) =>
                setProjects((ps) => ps.map((x) => (x.id === p.id ? np : x)))
              }
              onRemove={() => setProjects((ps) => ps.filter((x) => x.id !== p.id))}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ProjectCard({
  project,
  onChange,
  onRemove,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onRemove: () => void;
}) {
  const [task, setTask] = useState('');
  const done = project.tasks.filter((t) => t.done).length;
  return (
    <Card>
      <CardHeader
        title={project.name}
        subtitle={`${done} / ${project.tasks.length} complete`}
        right={
          <div className="flex items-center gap-1">
            <Badge tone="accent">{project.milestone}</Badge>
            <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove project">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-2">
        <ul className="space-y-1">
          {project.tasks.map((t) => (
            <li key={t.id}>
              <button
                className={cn(
                  'flex w-full items-start gap-2 rounded px-1 py-1 text-left text-sm hover:bg-ficsit-panel2',
                  t.done && 'text-ficsit-subtle line-through',
                )}
                onClick={() =>
                  onChange({
                    ...project,
                    tasks: project.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)),
                  })
                }
              >
                {t.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ficsit-good" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ficsit-subtle" />
                )}
                <span>{t.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Add task…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && task.trim()) {
                onChange({
                  ...project,
                  tasks: [
                    ...project.tasks,
                    { id: crypto.randomUUID(), text: task.trim(), done: false },
                  ],
                });
                setTask('');
              }
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}

'use client';
import { useMemo } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { useLocalStorage } from '@/lib/storage/use-local-storage';
import { DEFAULT_STATE, PLANNER_KEY, type PlannerState, type Project, type Task } from '@/lib/planner/types';
import { KPIStrip } from '@/components/planner/KPIStrip';
import { ProjectList } from '@/components/planner/ProjectList';
import { ProjectDetail } from '@/components/planner/ProjectDetail';

export default function PlannerPage() {
  const [state, setState] = useLocalStorage<PlannerState>(PLANNER_KEY, DEFAULT_STATE);
  const active = useMemo(() => state.projects.find((p) => p.id === state.activeId) ?? null, [state]);

  function log(kind: Parameters<typeof appendActivity>[0], projectId: string, message: string) {
    setState((s) => appendActivity(kind, projectId, message, s));
  }

  function createProject() {
    const id = crypto.randomUUID();
    const now = Date.now();
    const project: Project = {
      id,
      name: `New Project ${state.projects.length + 1}`,
      tier: 0,
      status: 'planning',
      description: '',
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((s) => ({
      ...s,
      projects: [...s.projects, project],
      activeId: id,
      activity: [
        ...s.activity,
        { id: crypto.randomUUID(), at: now, kind: 'project.create', projectId: id, message: `Created project "${project.name}".` },
      ],
    }));
  }

  function patchProject(patch: Partial<Project>) {
    if (!active) return;
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === active.id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
      activity: [
        ...s.activity,
        {
          id: crypto.randomUUID(),
          at: Date.now(),
          kind: 'project.edit',
          projectId: active.id,
          message: `Updated ${Object.keys(patch).join(', ')}.`,
        },
      ],
    }));
  }

  function deleteProject() {
    if (!active) return;
    if (!confirm(`Delete project "${active.name}"? This cannot be undone.`)) return;
    setState((s) => {
      const projects = s.projects.filter((p) => p.id !== active.id);
      return {
        ...s,
        projects,
        activeId: projects[0]?.id ?? null,
        activity: [
          ...s.activity,
          { id: crypto.randomUUID(), at: Date.now(), kind: 'project.delete', projectId: active.id, message: `Deleted project "${active.name}".` },
        ],
      };
    });
  }

  function addTask(text: string) {
    if (!active) return;
    const t: Task = {
      id: crypto.randomUUID(),
      text,
      status: 'todo',
      priority: 'med',
      createdAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === active.id ? { ...p, tasks: [...p.tasks, t], updatedAt: Date.now() } : p,
      ),
      activity: [
        ...s.activity,
        { id: crypto.randomUUID(), at: Date.now(), kind: 'task.add', projectId: active.id, message: `Added task: "${text}".` },
      ],
    }));
  }

  function updateTask(taskId: string, patch: Partial<Task>) {
    if (!active) return;
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === active.id
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
              updatedAt: Date.now(),
            }
          : p,
      ),
      activity:
        'status' in patch
          ? [
              ...s.activity,
              {
                id: crypto.randomUUID(),
                at: Date.now(),
                kind: 'task.status',
                projectId: active.id,
                message: `Task → ${patch.status}: "${
                  active.tasks.find((t) => t.id === taskId)?.text ?? taskId
                }".`,
              },
            ]
          : s.activity,
    }));
  }

  function deleteTask(taskId: string) {
    if (!active) return;
    const t = active.tasks.find((x) => x.id === taskId);
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === active.id ? { ...p, tasks: p.tasks.filter((x) => x.id !== taskId), updatedAt: Date.now() } : p,
      ),
      activity: [
        ...s.activity,
        { id: crypto.randomUUID(), at: Date.now(), kind: 'task.delete', projectId: active.id, message: `Removed task: "${t?.text ?? taskId}".` },
      ],
    }));
  }

  function selectProject(id: string) {
    setState((s) => ({ ...s, activeId: id }));
  }

  // unused but kept for clarity if/when needed:
  void log;

  const activitySorted = useMemo(() => state.activity.slice().sort((a, b) => b.at - a.at), [state.activity]);

  return (
    <>
      <PageHeader
        title="Planner"
        subtitle="Track factory expansion across tiers — UniFi-style master/detail with live state."
      />
      <div className="space-y-4 p-6">
        <KPIStrip projects={state.projects} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <div className="rounded-lg border border-ficsit-border bg-ficsit-panel min-h-[60vh]">
            <ProjectList
              projects={state.projects}
              activeId={state.activeId}
              onSelect={selectProject}
              onCreate={createProject}
            />
          </div>
          <div className="overflow-hidden rounded-lg border border-ficsit-border bg-ficsit-panel min-h-[60vh]">
            <ProjectDetail
              project={active}
              activity={activitySorted}
              onEdit={patchProject}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onDeleteProject={deleteProject}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function appendActivity(
  kind: 'task.add' | 'task.status' | 'task.delete' | 'project.create' | 'project.edit' | 'project.delete',
  projectId: string,
  message: string,
  s: PlannerState,
): PlannerState {
  return {
    ...s,
    activity: [...s.activity, { id: crypto.randomUUID(), at: Date.now(), kind, projectId, message }],
  };
}

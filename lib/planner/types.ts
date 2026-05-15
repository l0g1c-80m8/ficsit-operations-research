export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type Priority = 'low' | 'med' | 'high';
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done';

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: number;
  notes?: string;
}

export interface ActivityEvent {
  id: string;
  at: number;
  kind: 'task.add' | 'task.status' | 'task.delete' | 'project.create' | 'project.edit' | 'project.delete';
  projectId: string;
  message: string;
}

export interface Project {
  id: string;
  name: string;
  tier: number;
  description: string;
  status: ProjectStatus;
  targetItem?: string;
  targetRatePerMin?: number;
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
}

export interface PlannerState {
  projects: Project[];
  activeId: string | null;
  activity: ActivityEvent[];
}

export const PLANNER_KEY = 'ficsit.planner.v1';

export const DEFAULT_STATE: PlannerState = {
  projects: [
    {
      id: 'p_iron',
      name: 'Phase 1 — Iron Foundry',
      tier: 1,
      status: 'active',
      description: 'Northern Forest iron belt. Supply 480 ore/min into a smelter + constructor array.',
      targetItem: 'Desc_IronPlate_C',
      targetRatePerMin: 60,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: [
        { id: 't1', text: 'Place 8 Miner Mk.1 on Northern Forest iron nodes', status: 'done', priority: 'high', createdAt: Date.now() - 86400000 },
        { id: 't2', text: 'Run 480 ore/min into Smelter array (8x at 100%)', status: 'done', priority: 'high', createdAt: Date.now() - 86400000 },
        { id: 't3', text: 'Build 8x Constructor for Iron Plate', status: 'doing', priority: 'med', createdAt: Date.now() },
        { id: 't4', text: 'Belt to central storage hub', status: 'todo', priority: 'med', createdAt: Date.now() },
        { id: 't5', text: 'Power grid expansion — 4× Biomass Burner', status: 'blocked', priority: 'high', createdAt: Date.now(), notes: 'Waiting on solid biofuel deliveries.' },
      ],
    },
    {
      id: 'p_alu',
      name: 'Phase 2 — Aluminum',
      tier: 7,
      status: 'planning',
      description: 'Bauxite + Water near Spire Coast. Evaluate Sloppy Alumina alt.',
      targetItem: 'Desc_AluminumIngot_C',
      targetRatePerMin: 120,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: [
        { id: 't1', text: 'Survey Bauxite + Water near Spire Coast', status: 'todo', priority: 'med', createdAt: Date.now() },
        { id: 't2', text: 'Decide between Sloppy Alumina vs. standard', status: 'todo', priority: 'low', createdAt: Date.now() },
      ],
    },
  ],
  activeId: 'p_iron',
  activity: [],
};

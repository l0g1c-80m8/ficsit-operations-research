'use client';
import Link from 'next/link';
import {
  Calculator,
  BookOpen,
  Compass,
  Map as MapIcon,
  Save as SaveIcon,
  ClipboardList,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';

const tiles = [
  {
    href: '/atlas',
    title: 'World Atlas',
    desc: 'Every node, well, geyser, slug and crash site — in save coordinates.',
    icon: Compass,
  },
  {
    href: '/progression',
    title: 'Progression',
    desc: 'Milestones, MAM, and Space Elevator phases read from your save.',
    icon: Trophy,
  },
  {
    href: '/map',
    title: 'Interactive Map',
    desc: 'The full community map, embedded with all its filter controls.',
    icon: MapIcon,
  },
  {
    href: '/save',
    title: 'Save File Viewer',
    desc: 'Upload a .sav and visualize your factory footprint.',
    icon: SaveIcon,
  },
  {
    href: '/recipes',
    title: 'Recipe Knowledge Base',
    desc: 'Browse every standard and alternate recipe in the game.',
    icon: BookOpen,
  },
  {
    href: '/calculator',
    title: 'Production Calculator',
    desc: 'LP-optimized factory plans from your inputs and targets.',
    icon: Calculator,
  },
  {
    href: '/planner',
    title: 'Planner',
    desc: 'Higher-level project planning across milestones.',
    icon: ClipboardList,
  },
];

export default function Dashboard() {
  const { data, loading } = useGameData();
  const stats = data
    ? [
        { label: 'Recipes', value: data.recipes.length },
        { label: 'Items', value: Object.keys(data.items).length },
        { label: 'Buildings', value: Object.keys(data.buildings).length },
        { label: 'Raw Resources', value: Object.keys(data.resources).length },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Ficsit Operations Center"
        subtitle="Welcome back, Pioneer. Productivity awaits."
        actions={<Badge tone="accent">ADA ONLINE</Badge>}
      />
      <div className="p-6 space-y-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardBody>
                    <div className="h-3 w-24 animate-pulse rounded bg-ficsit-panel2" />
                    <div className="mt-2 h-6 w-12 animate-pulse rounded bg-ficsit-panel2" />
                  </CardBody>
                </Card>
              ))
            : stats.map((s) => (
                <Card key={s.label}>
                  <CardBody>
                    <div className="text-xs uppercase tracking-wide text-ficsit-subtle">{s.label}</div>
                    <div className="mt-1 font-mono text-2xl text-ficsit-accent">{fmt(s.value)}</div>
                  </CardBody>
                </Card>
              ))}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiles.map((t) => (
            <Link key={t.href} href={t.href} className="block group">
              <Card className="h-full transition-colors group-hover:border-ficsit-accent/50">
                <CardBody className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-ficsit-accent/15 text-ficsit-accent">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <p className="mt-1 text-sm text-ficsit-subtle">{t.desc}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </section>

        <section>
          <Card>
            <CardHeader title="ADA's Notes" subtitle="Operational reminders for the diligent Pioneer." />
            <CardBody className="space-y-2 text-sm text-ficsit-subtle">
              <p>
                <span className="text-ficsit-text">Recipe data:</span> 211 machine recipes loaded from the official
                community Docs.json export — both standard and alternate.
              </p>
              <p>
                <span className="text-ficsit-text">Optimizer:</span> the Calculator solves a linear program over all
                available recipes, returning fractional machine counts (you can overclock to match).
              </p>
              <p>
                <span className="text-ficsit-text">Safety reminder:</span> please refrain from dying. The replacement
                process is uncomfortable.
              </p>
            </CardBody>
          </Card>
        </section>
      </div>
    </>
  );
}

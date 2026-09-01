'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const MAP_SOURCES = [
  { id: 'scim', label: 'Satisfactory Calculator', url: 'https://satisfactory-calculator.com/en/interactive-map' },
  { id: 'mapgenie', label: 'Map Genie', url: 'https://mapgenie.io/satisfactory/maps/massage-2-a-b' },
];

export default function MapPage() {
  const [source, setSource] = useState(MAP_SOURCES[0]);
  const [key, setKey] = useState(0);

  return (
    <>
      <PageHeader
        title="World Map"
        subtitle="Resource nodes, slugs, and points of interest — with full filter controls."
        actions={
          <>
            <div className="flex rounded-md border border-ficsit-border bg-ficsit-panel2 p-0.5">
              {MAP_SOURCES.map((s) => (
                <Button
                  key={s.id}
                  variant={source.id === s.id ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setSource(s)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setKey((k) => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Reload
            </Button>
            <a href={source.url} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </Button>
            </a>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <iframe
            key={key}
            src={source.url}
            title={source.label}
            className="h-[calc(100vh-12rem)] w-full"
          />
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Map Filters" subtitle="Filter overlays live inside the embedded map." />
            <CardBody className="space-y-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-ficsit-subtle">Resource Layers</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {['Iron', 'Copper', 'Coal', 'Caterium', 'Quartz', 'Sulfur', 'Bauxite', 'Uranium', 'Oil', 'Nitrogen'].map((r) => (
                    <Badge key={r} tone="default">{r}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-ficsit-subtle">Collectibles</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {['Power Slugs', 'Hard Drives', 'Mercer Spheres', 'Somersloops', 'Berries', 'Nuts'].map((r) => (
                    <Badge key={r} tone="default">{r}</Badge>
                  ))}
                </div>
              </div>
              <p className="pt-2 text-xs text-ficsit-subtle">
                Toggle these layers inside the iframe. For a native, offline-capable version of the
                node and collectible layers — in the same coordinate space as the Save viewer — see{' '}
                <Link href="/atlas" className="text-ficsit-accent hover:underline">
                  World Atlas
                </Link>
                .
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tip" />
            <CardBody className="text-xs text-ficsit-subtle">
              The Satisfactory Calculator map can also accept your save file for a real factory overlay. Drop a .sav
              on the Save File page to extract structured actor data locally — no upload required.
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

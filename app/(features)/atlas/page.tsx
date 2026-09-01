'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { WorldAtlas } from '@/components/atlas/WorldAtlas';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  LAYER_COLOR,
  markerColor,
  PURITIES,
  PURITY_LABEL,
} from '@/components/atlas/markerStyles';
import { useMapMarkers } from '@/lib/data/use-markers';
import type { MarkerCategory, MarkerPurity } from '@/lib/data/markers';
import { cn, fmt } from '@/lib/utils';

export default function AtlasPage() {
  const { markers, loading, error } = useMapMarkers();
  const layers = useMemo(() => markers?.layers ?? [], [markers]);

  // All layers on by default except power slugs — 1 242 of them bury everything
  // else at default zoom.
  const [visibleLayers, setVisibleLayers] = useState<Set<string> | null>(null);
  const [visiblePurities, setVisiblePurities] = useState<Set<MarkerPurity>>(
    () => new Set(PURITIES),
  );

  const effectiveVisible = useMemo(() => {
    if (visibleLayers) return visibleLayers;
    return new Set(layers.filter((l) => l.category !== 'slugs').map((l) => l.id));
  }, [visibleLayers, layers]);

  const toggleLayer = (id: string) => {
    const next = new Set(effectiveVisible);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setVisibleLayers(next);
  };

  const toggleCategory = (cat: MarkerCategory) => {
    const ids = layers.filter((l) => l.category === cat).map((l) => l.id);
    const allOn = ids.every((id) => effectiveVisible.has(id));
    const next = new Set(effectiveVisible);
    for (const id of ids) {
      if (allOn) next.delete(id);
      else next.add(id);
    }
    setVisibleLayers(next);
  };

  const togglePurity = (p: MarkerPurity) => {
    const next = new Set(visiblePurities);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setVisiblePurities(next);
  };

  const shownCount = useMemo(
    () =>
      layers
        .filter((l) => effectiveVisible.has(l.id))
        .reduce(
          (n, l) =>
            n +
            l.markers.filter((m) => !m.purity || visiblePurities.has(m.purity)).length,
          0,
        ),
    [layers, effectiveVisible, visiblePurities],
  );

  return (
    <>
      <PageHeader
        title="World Atlas"
        subtitle="Every resource node, well, geyser, slug, artifact, and crash site — in save-file coordinates."
        actions={
          <>
            <span className="font-mono text-xs text-ficsit-subtle">
              {fmt(shownCount, 0)} shown
            </span>
            <Link href="/map">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3.5 w-3.5" /> Interactive map
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-[1fr_300px]">
        <div className="order-2 xl:order-1">
          {loading && (
            <Card>
              <CardBody className="grid h-[60vh] place-items-center text-sm text-ficsit-subtle">
                Loading world markers…
              </CardBody>
            </Card>
          )}
          {error && (
            <Card>
              <CardBody className="space-y-2 text-sm">
                <p className="text-red-400">Failed to load map markers.</p>
                <p className="text-ficsit-subtle">
                  Run <code className="text-ficsit-accent">npm run map-markers</code> to regenerate{' '}
                  <code>public/data/map-markers.json</code>, then reload.
                </p>
              </CardBody>
            </Card>
          )}
          {markers && (
            <WorldAtlas
              layers={layers}
              visibleLayers={effectiveVisible}
              visiblePurities={visiblePurities}
            />
          )}
        </div>

        <div className="order-1 space-y-3 xl:order-2">
          <Card>
            <CardHeader
              title="Purity"
              subtitle="Applies to nodes, wells, and geysers. Pure sites get a bright ring."
            />
            <CardBody className="flex flex-wrap gap-1.5">
              {PURITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePurity(p)}
                  className={cn(
                    'rounded-md border px-2 py-1 font-mono text-[11px] transition-colors',
                    visiblePurities.has(p)
                      ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent'
                      : 'border-ficsit-border bg-ficsit-panel text-ficsit-subtle hover:bg-ficsit-panel2',
                  )}
                >
                  {PURITY_LABEL[p]}
                </button>
              ))}
            </CardBody>
          </Card>

          {CATEGORY_ORDER.filter((cat) => layers.some((l) => l.category === cat)).map((cat) => {
            const catLayers = layers.filter((l) => l.category === cat);
            const allOn = catLayers.every((l) => effectiveVisible.has(l.id));
            return (
              <Card key={cat}>
                <CardHeader
                  title={CATEGORY_LABEL[cat]}
                  right={
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="text-[10px] uppercase tracking-wider text-ficsit-subtle hover:text-ficsit-accent"
                    >
                      {allOn ? 'None' : 'All'}
                    </button>
                  }
                />
                <CardBody className="space-y-0.5 p-2">
                  {catLayers.map((l) => {
                    const on = effectiveVisible.has(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLayer(l.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors',
                          on ? 'text-ficsit-text hover:bg-ficsit-panel2' : 'text-ficsit-subtle/60 hover:bg-ficsit-panel2',
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/40"
                          style={{
                            background: on ? (LAYER_COLOR[l.id] ?? markerColor(l.id)) : 'transparent',
                            borderColor: LAYER_COLOR[l.id] ?? '#475569',
                          }}
                        />
                        {l.item && <ItemIcon className={l.item} size={14} />}
                        <span className="flex-1 truncate">{l.label}</span>
                        <span className="font-mono text-[10px] text-ficsit-subtle">{l.count}</span>
                      </button>
                    );
                  })}
                </CardBody>
              </Card>
            );
          })}

          <Card>
            <CardHeader title="Data source" />
            <CardBody className="space-y-1.5 text-[11px] leading-relaxed text-ficsit-subtle">
              <p>{markers?.attribution ?? 'Loading…'}</p>
              {markers && (
                <p className="font-mono">
                  v{markers.sourceVersion} · generated {markers.generatedAt.slice(0, 10)}
                </p>
              )}
              <p className="flex items-start gap-1 pt-1">
                <Compass className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  Coordinates are UE world units, the same space the Save viewer reports — a marker
                  here sits where the Topograph would draw it.
                </span>
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  HardDrive,
  Milestone,
  Rocket,
  Save as SaveIcon,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatTile } from '@/components/ui/StatTile';
import { TabGroup, type Tab } from '@/components/ui/TabGroup';
import { SaveDropzone } from '@/components/save-viewer/SaveDropzone';
import { SchematicList } from '@/components/progression/SchematicList';
import { PhaseTracker } from '@/components/progression/PhaseTracker';
import { RemainingParts } from '@/components/progression/RemainingParts';
import { useGameData } from '@/lib/data/use-data';
import { appendHistory, loadHistory } from '@/lib/save/history';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { deriveProgression } from '@/lib/progression/derive';
import { fmt } from '@/lib/utils';

type TabId = 'milestones' | 'mam' | 'elevator' | 'alternates';

export default function ProgressionPage() {
  const { data } = useGameData();
  const [summary, setSummary] = useState<ParsedSaveSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checkedHistory, setCheckedHistory] = useState(false);
  const [tab, setTab] = useState<TabId>('milestones');

  // Pick up the newest save the user already uploaded on /save — the two views
  // share one IndexedDB history, so dropping a file in either place is enough.
  useEffect(() => {
    let alive = true;
    loadHistory()
      .then((entries) => {
        if (!alive) return;
        const newest = entries[0];
        if (newest) {
          setSummary(newest.summary);
          setFileName(newest.fileName);
        }
        setCheckedHistory(true);
      })
      .catch(() => alive && setCheckedHistory(true));
    return () => {
      alive = false;
    };
  }, []);

  const onParsed = useCallback((s: ParsedSaveSummary, file: File) => {
    setSummary(s);
    setFileName(file.name);
    void appendHistory(file, s);
  }, []);

  const model = useMemo(
    () => (data ? deriveProgression(data.schematics, summary?.progression) : null),
    [data, summary],
  );

  const progression = summary?.progression;
  // A save parsed but with no schematic manager found means our property
  // guesses missed — worth calling out rather than silently showing 0/48.
  const unreadable =
    summary != null && (!progression || !progression.sources.schematicManager);

  const tabs: Tab<TabId>[] = model
    ? [
        { id: 'milestones', label: 'Milestones', icon: Milestone, count: model.totals.milestonesTotal },
        { id: 'mam', label: 'MAM Research', icon: FlaskConical, count: model.totals.mamTotal },
        { id: 'elevator', label: 'Space Elevator', icon: Rocket, count: model.totals.phasesTotal },
        { id: 'alternates', label: 'Alternates', icon: HardDrive, count: model.totals.alternatesTotal },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Progression"
        subtitle="Milestones, MAM research, and Project Assembly — read straight from your save."
        actions={
          fileName && (
            <span className="font-mono text-xs text-ficsit-subtle" title={fileName}>
              {fileName}
            </span>
          )
        }
      />

      <div className="space-y-4 p-6">
        {/* ── No save yet ── */}
        {!summary && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader
                title="Load a save"
                subtitle="Parsed entirely in your browser — nothing is uploaded anywhere."
              />
              <CardBody className="text-sm text-ficsit-subtle">
                Progression is read from the save&apos;s schematic and game-phase managers, so this
                page needs a <code>.sav</code> file. Drop one below, or upload it on the{' '}
                <Link href="/save" className="text-ficsit-accent hover:underline">
                  Save File
                </Link>{' '}
                page — both views share the same history.
              </CardBody>
            </Card>
            <SaveDropzone onParsed={onParsed} />
            {checkedHistory && (
              <p className="text-center text-xs text-ficsit-subtle">
                No previously uploaded saves found.
              </p>
            )}
          </div>
        )}

        {/* ── Save loaded but progression unreadable ── */}
        {unreadable && (
          <Card>
            <CardHeader title="Couldn't read progression from this save" />
            <CardBody className="space-y-2 text-sm text-ficsit-subtle">
              <p>
                The file parsed ({fmt(summary!.actorCount, 0)} actors) but no schematic manager was
                found, so nothing can be marked complete. This usually means the save predates
                1.0, or the manager property names shifted in a newer patch.
              </p>
              <p>
                Run{' '}
                <code className="text-ficsit-accent">
                  node scripts/probe-progression.mjs &lt;your.sav&gt;
                </code>{' '}
                to see what the file actually carries, then adjust{' '}
                <code>lib/save/progression.ts</code>.
              </p>
              <div className="pt-1">
                <Link href="/save">
                  <Button variant="secondary" size="sm">
                    <SaveIcon className="h-3.5 w-3.5" /> Open the Save viewer
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── The tracker ── */}
        {model && summary && !unreadable && (
          <>
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Milestones"
                value={`${model.totals.milestonesDone}/${model.totals.milestonesTotal}`}
                icon={Milestone}
                tone="accent"
                progress={model.totals.milestonesTotal ? model.totals.milestonesDone / model.totals.milestonesTotal : 0}
              />
              <StatTile
                label="MAM Research"
                value={`${model.totals.mamDone}/${model.totals.mamTotal}`}
                icon={FlaskConical}
                tone="info"
                progress={model.totals.mamTotal ? model.totals.mamDone / model.totals.mamTotal : 0}
              />
              <StatTile
                label="Alternates"
                value={`${model.totals.alternatesDone}/${model.totals.alternatesTotal}`}
                icon={HardDrive}
                tone="default"
                progress={model.totals.alternatesTotal ? model.totals.alternatesDone / model.totals.alternatesTotal : 0}
              />
              <StatTile
                label="Project Assembly"
                value={
                  model.currentPhase == null
                    ? '—'
                    : `${model.totals.phasesDone}/${model.totals.phasesTotal}`
                }
                sub={model.currentPhase != null ? `Phase ${model.currentPhase} in progress` : 'Phase unknown'}
                icon={Trophy}
                tone="good"
                progress={model.totals.phasesDone / model.totals.phasesTotal}
              />
            </section>

            <RemainingParts model={model} data={data} />

            <TabGroup tabs={tabs} active={tab} onSelect={setTab} />

            {tab === 'milestones' && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {model.milestones.map((g) => (
                  <SchematicList key={g.id} group={g} data={data} />
                ))}
              </div>
            )}

            {tab === 'mam' && (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {model.mam.map((g) => (
                  <SchematicList key={g.id} group={g} data={data} />
                ))}
              </div>
            )}

            {tab === 'elevator' && (
              <PhaseTracker phases={model.phases} data={data} currentPhase={model.currentPhase} />
            )}

            {tab === 'alternates' && (
              <div className="max-w-3xl">
                <SchematicList group={model.alternates} data={data} showCost={false} />
              </div>
            )}

            <div className="pt-2">
              <SaveDropzone onParsed={onParsed} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

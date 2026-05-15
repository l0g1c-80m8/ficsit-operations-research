'use client';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import type { FactoryPlan } from '@/lib/solver/factory-solver';
import { Coins, TrendingDown, Zap } from 'lucide-react';

interface GeneratorOption {
  name: string;
  buildingClass: string;
  perUnitMW: number;
  description: string;
}

/** Realistic generator sizing options. Coal/Fuel/Nuclear all use the in-game
 *  rated power output per unit at 100% clock. */
const GENERATORS: GeneratorOption[] = [
  { name: 'Biomass Burner', buildingClass: 'Desc_GeneratorBiomass_C', perUnitMW: 30, description: 'Early-game; burns biomass.' },
  { name: 'Coal Generator', buildingClass: 'Desc_GeneratorCoal_C', perUnitMW: 75, description: '45 coal/m + 45 water/m per unit.' },
  { name: 'Fuel Generator', buildingClass: 'Desc_GeneratorFuel_C', perUnitMW: 250, description: '20 fuel/m per unit.' },
  { name: 'Nuclear Power Plant', buildingClass: 'Desc_GeneratorNuclear_C', perUnitMW: 2500, description: '0.2 uranium-fuel-rod/m per unit.' },
];

export function Economics({ plan }: { plan: FactoryPlan }) {
  const { data } = useGameData();

  // Liquids and gases can't be sunk in the AWESOME Sink — treat them as 0 pts.
  const sinkPts = (item: string) => {
    if (!data) return 0;
    const it = data.items[item];
    if (!it || it.liquid) return 0;
    return it.sinkPoints ?? 0;
  };

  const valueOut = useMemo(() => {
    if (!data) return 0;
    return plan.outputs.reduce((acc, o) => acc + sinkPts(o.item) * o.ratePerMin, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, plan.outputs]);

  const valueIn = useMemo(() => {
    if (!data) return 0;
    return plan.consumedInputs.reduce((acc, o) => acc + sinkPts(o.item) * o.ratePerMin, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, plan.consumedInputs]);

  const valueNet = valueOut - valueIn;

  if (plan.status !== 'optimal') return null;

  const power = plan.totalPowerKW;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-1.5"><Coins className="h-4 w-4" /> AWESOME Sink Economics</span>}
          subtitle="Sink point value per minute. Sink output, sink input cost, net."
        />
        <CardBody className="space-y-2">
          <SinkRow label="Output value" value={valueOut} tone="good" />
          <SinkRow label="Input value (raw cost)" value={valueIn} tone="muted" />
          <div className="border-t border-ficsit-border pt-2">
            <SinkRow
              label="Net value"
              value={valueNet}
              tone={valueNet > 0 ? 'good' : valueNet < 0 ? 'bad' : 'muted'}
            />
          </div>
          {data && plan.outputs.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-widest text-ficsit-subtle">Outputs by value/min</div>
              <ul className="mt-1.5 space-y-1">
                {plan.outputs
                  .map((o) => ({
                    item: o.item,
                    rate: o.ratePerMin,
                    pts: sinkPts(o.item),
                  }))
                  .sort((a, b) => b.pts * b.rate - a.pts * a.rate)
                  .map((row) => (
                    <li key={row.item} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <ItemIcon className={row.item} size={18} />
                        {data.items[row.item]?.name ?? row.item}
                        <span className="text-[10px] text-ficsit-subtle">
                          {row.pts} pts × {fmt(row.rate)}/m
                        </span>
                      </span>
                      <span className="font-mono text-ficsit-good">{fmt(row.pts * row.rate)} pts/m</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4" /> Power Infrastructure</span>}
          subtitle={`Plan draws ${fmt(power)} MW at 100% clock. Suggested generator counts:`}
        />
        <CardBody>
          <ul className="space-y-2">
            {GENERATORS.map((g) => {
              const units = Math.max(0, Math.ceil(power / g.perUnitMW));
              const overshoot = units * g.perUnitMW - power;
              return (
                <li
                  key={g.buildingClass}
                  className="flex items-center gap-3 rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 py-2"
                >
                  <ItemIcon className={g.buildingClass} kind="building" size={32} cls="rounded-md p-0.5 bg-ficsit-panel" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-[11px] text-ficsit-subtle">
                      {g.description} {g.perUnitMW} MW each.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg text-ficsit-accent">{units}</div>
                    <div className="text-[10px] text-ficsit-subtle">
                      +{fmt(overshoot)} MW headroom
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ficsit-subtle">
            <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Plans containing variable-power recipes (Converter / Particle Accelerator / Quantum Encoder) are sized for the *average* draw. Provision ~20% headroom for the swings.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function SinkRow({ label, value, tone }: { label: string; value: number; tone: 'good' | 'muted' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-ficsit-good' : tone === 'bad' ? 'text-ficsit-bad' : 'text-ficsit-text';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ficsit-subtle">{label}</span>
      <span className={`font-mono ${toneClass}`}>{fmt(value)} pts/m</span>
    </div>
  );
}

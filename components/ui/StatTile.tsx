import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type StatTone = 'default' | 'accent' | 'good' | 'info' | 'bad';

const TONES: Record<StatTone, string> = {
  default: 'text-ficsit-text',
  accent: 'text-ficsit-accent',
  good: 'text-ficsit-good',
  info: 'text-sky-300',
  bad: 'text-ficsit-bad',
};

const ICON_BG: Record<StatTone, string> = {
  default: 'bg-ficsit-panel2 text-ficsit-subtle',
  accent: 'bg-ficsit-accent/15 text-ficsit-accent',
  good: 'bg-ficsit-good/15 text-ficsit-good',
  info: 'bg-sky-500/15 text-sky-300',
  bad: 'bg-ficsit-bad/15 text-ficsit-bad',
};

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional subtitle under the value (e.g., "+14% headroom") */
  sub?: ReactNode;
  /** Optional lucide-react Icon component. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Color tone for value text + icon chip. */
  tone?: StatTone;
  /** Optional progress bar (0–1) drawn at the bottom. */
  progress?: number;
  /** Compact variant — smaller padding, smaller value font. */
  compact?: boolean;
  className?: string;
}

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  progress,
  compact = false,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-ficsit-border bg-ficsit-panel',
        compact ? 'p-3' : 'p-3 md:p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-ficsit-subtle">{label}</div>
        {Icon && (
          <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md', ICON_BG[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn('mt-1 font-mono tabular-nums', TONES[tone], compact ? 'text-xl' : 'text-2xl')}>
        {value}
      </div>
      {sub != null && <div className="mt-0.5 text-[11px] text-ficsit-subtle">{sub}</div>}
      {progress != null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ficsit-panel2">
          <div
            className={cn(
              'h-full transition-[width]',
              tone === 'good' ? 'bg-ficsit-good' : tone === 'bad' ? 'bg-ficsit-bad' : 'bg-ficsit-accent',
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

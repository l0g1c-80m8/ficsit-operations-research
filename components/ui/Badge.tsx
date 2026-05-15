import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type Tone = 'default' | 'accent' | 'good' | 'warn' | 'bad' | 'muted';

const tones: Record<Tone, string> = {
  default: 'bg-ficsit-panel2 text-ficsit-text border-ficsit-border',
  accent: 'bg-ficsit-accent/15 text-ficsit-accent border-ficsit-accent/40',
  good: 'bg-ficsit-good/15 text-ficsit-good border-ficsit-good/40',
  warn: 'bg-ficsit-warn/15 text-ficsit-warn border-ficsit-warn/40',
  bad: 'bg-ficsit-bad/15 text-ficsit-bad border-ficsit-bad/40',
  muted: 'bg-ficsit-panel2 text-ficsit-subtle border-ficsit-border',
};

export function Badge({
  tone = 'default',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}

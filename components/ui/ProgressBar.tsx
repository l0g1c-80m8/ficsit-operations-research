import { cn } from '@/lib/utils';

export type ProgressTone = 'accent' | 'good' | 'warn' | 'bad';

const TONES: Record<ProgressTone, string> = {
  accent: 'bg-ficsit-accent',
  good: 'bg-ficsit-good',
  warn: 'bg-ficsit-warn',
  bad: 'bg-ficsit-bad',
};

export function ProgressBar({
  value,
  tone = 'accent',
  className,
}: {
  /** 0–1 fraction (values outside the range are clamped). */
  value: number;
  tone?: ProgressTone;
  className?: string;
}) {
  return (
    <div className={cn('h-1 overflow-hidden rounded-full bg-ficsit-panel2', className)}>
      <div
        className={cn('h-full transition-[width]', TONES[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

'use client';
import { useGameData } from '@/lib/data/use-data';
import { cn } from '@/lib/utils';

export function ItemBadge({ item, className }: { item: string; className?: string }) {
  const { data } = useGameData();
  const it = data?.items[item];
  const name = it?.name ?? item;
  const liquid = it?.liquid;
  const initial = name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 py-0.5 text-xs',
        className,
      )}
      title={it?.description ?? name}
    >
      <span
        className={cn(
          'grid h-4 w-4 place-items-center rounded-sm font-mono text-[8px] font-bold',
          liquid ? 'bg-sky-600 text-white' : 'bg-ficsit-accent/30 text-ficsit-accent',
        )}
      >
        {initial}
      </span>
      <span className="truncate max-w-[10rem]">{name}</span>
    </span>
  );
}

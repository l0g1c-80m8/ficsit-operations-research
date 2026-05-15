'use client';
import { useGameData } from '@/lib/data/use-data';
import { cn } from '@/lib/utils';
import { ItemIcon } from './ItemIcon';

export function ItemBadge({
  item,
  className,
  size = 18,
  showName = true,
}: {
  item: string;
  className?: string;
  size?: number;
  showName?: boolean;
}) {
  const { data } = useGameData();
  const it = data?.items[item];
  const name = it?.name ?? item;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-ficsit-border bg-ficsit-panel2 px-1.5 py-0.5 text-xs',
        className,
      )}
      title={it?.description ?? name}
    >
      <ItemIcon className={item} size={size} />
      {showName && <span className="truncate max-w-[10rem]">{name}</span>}
    </span>
  );
}

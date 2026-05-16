'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useGameData } from '@/lib/data/use-data';
import { assetPath } from '@/lib/utils/paths';

type Kind = 'item' | 'building';

export interface ItemIconProps {
  className: string;
  kind?: Kind;
  size?: number;
  rounded?: boolean;
  cls?: string;
  title?: string;
}

/** Renders a Satisfactory item or building icon, falling back to a glyph if the file is missing. */
export function ItemIcon({
  className,
  kind = 'item',
  size = 24,
  rounded = true,
  cls,
  title,
}: ItemIconProps) {
  const [err, setErr] = useState(false);
  const { data } = useGameData();
  const lookup =
    kind === 'item' ? data?.items[className]?.name : data?.buildings[className]?.name;
  const label = lookup ?? className;
  const liquid = kind === 'item' && data?.items[className]?.liquid;
  const src = assetPath(`/icons/${kind === 'item' ? 'items' : 'buildings'}/${className}.png`);
  const initial = label
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  if (err) {
    return (
      <span
        aria-label={label}
        title={title ?? label}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.36) }}
        className={cn(
          'inline-grid place-items-center shrink-0 font-mono font-bold',
          liquid ? 'bg-sky-600 text-white' : 'bg-ficsit-accent/30 text-ficsit-accent',
          rounded ? 'rounded-sm' : '',
          cls,
        )}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      title={title ?? label}
      width={size}
      height={size}
      onError={() => setErr(true)}
      className={cn('shrink-0 object-contain', rounded && 'rounded-sm', cls)}
      loading="lazy"
      decoding="async"
    />
  );
}

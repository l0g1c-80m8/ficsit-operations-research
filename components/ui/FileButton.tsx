import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** A <label>-wrapped hidden file input styled to look like a Button. Used by
 * every "Import JSON" affordance across the app. */
export function FileButton({
  accept,
  onSelect,
  children,
  className,
  size = 'sm',
}: {
  accept?: string;
  onSelect: (file: File) => void;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const sizing =
    size === 'sm'
      ? 'h-7 px-2 text-xs'
      : 'h-9 px-3 text-sm';
  return (
    <label
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md',
        'border border-ficsit-border bg-ficsit-panel2 font-medium text-ficsit-text',
        'transition-colors hover:bg-ficsit-border',
        sizing,
        className,
      )}
    >
      {children}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.currentTarget.value = '';
        }}
      />
    </label>
  );
}

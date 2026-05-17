'use client';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface Tab<K extends string> {
  id: K;
  label: ReactNode;
  /** Optional lucide-react Icon component. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional count chip next to the label. */
  count?: number;
}

export function TabGroup<K extends string>({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: Tab<K>[];
  active: K;
  onSelect: (id: K) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end gap-1 border-b border-ficsit-border', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={cn(
            'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
            active === t.id
              ? 'border-ficsit-accent text-ficsit-text'
              : 'border-transparent text-ficsit-subtle hover:text-ficsit-text',
          )}
        >
          {t.icon && <t.icon className="h-3.5 w-3.5" />}
          <span className="capitalize">{t.label}</span>
          {t.count != null && (
            <span className="ml-1 rounded bg-ficsit-panel2 px-1 text-[10px] text-ficsit-subtle">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

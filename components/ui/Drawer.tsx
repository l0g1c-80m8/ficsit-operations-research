'use client';
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  side = 'right',
  width = 'w-[640px]',
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  side?: 'right' | 'left';
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className={cn(
          'absolute top-0 flex h-full flex-col border-ficsit-border bg-ficsit-panel shadow-2xl transition-transform',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          width,
          'max-w-[95vw]',
          open
            ? 'translate-x-0'
            : side === 'right'
              ? 'translate-x-full'
              : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ficsit-border px-5 py-4">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-lg font-semibold">{title}</h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-ficsit-subtle">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ficsit-subtle hover:bg-ficsit-panel2 hover:text-ficsit-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-ficsit-border px-5 py-3">{footer}</div>}
      </aside>
    </div>
  );
}

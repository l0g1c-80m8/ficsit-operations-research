import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ficsit-border bg-ficsit-panel shadow-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ficsit-border px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-ficsit-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ficsit-subtle">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4', className)} {...rest}>
      {children}
    </div>
  );
}

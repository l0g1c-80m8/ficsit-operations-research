import { cn } from '@/lib/utils';
import { forwardRef, type SelectHTMLAttributes } from 'react';

/** A native <select> styled to match Input. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 text-sm text-ficsit-text',
          'focus:outline-none focus:ring-2 focus:ring-ficsit-accent disabled:opacity-60',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

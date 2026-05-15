import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 text-sm text-ficsit-text',
          'placeholder:text-ficsit-subtle focus:outline-none focus:ring-2 focus:ring-ficsit-accent',
          'disabled:opacity-60',
          className,
        )}
        {...rest}
      />
    );
  },
);

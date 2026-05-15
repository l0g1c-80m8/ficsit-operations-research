import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ficsit-accent text-black hover:bg-ficsit-accent2 focus-visible:ring-ficsit-accent disabled:bg-ficsit-border disabled:text-ficsit-subtle',
  secondary:
    'bg-ficsit-panel2 text-ficsit-text border border-ficsit-border hover:bg-ficsit-border',
  ghost: 'text-ficsit-text hover:bg-ficsit-panel2',
  danger: 'bg-ficsit-bad text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-ficsit-bg',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
});

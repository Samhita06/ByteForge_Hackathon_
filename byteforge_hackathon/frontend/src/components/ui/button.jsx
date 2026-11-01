import { cn } from '../../utils/cn.js';

const variants = {
  primary:
    'bg-accent text-slate-950 shadow-sm hover:brightness-110 disabled:opacity-60',
  secondary:
    'bg-white text-ink border border-line hover:bg-panel disabled:opacity-60',
  ghost: 'bg-transparent text-slate-500 hover:bg-panel hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({ className, variant = 'primary', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

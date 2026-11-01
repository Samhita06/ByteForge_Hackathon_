import { cn } from '../../utils/cn.js';

const variants = {
  primary:
    'bg-accent text-white shadow-sm hover:bg-[#5b3cf0] disabled:opacity-60',
  secondary:
    'bg-white text-ink border border-line hover:bg-panel disabled:opacity-60',
  ghost: 'bg-transparent text-slate-200 hover:bg-white/10',
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

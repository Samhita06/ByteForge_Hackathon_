import { cn } from '../../utils/cn.js';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl border border-line bg-card p-5 shadow-sm', className)} {...props} />;
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'text-secondary',
    violet: 'accent-primary',
    green: 'success',
    amber: 'warning',
    rose: 'danger',
    blue: 'accent-blue',
  };
  const color = tones[tone] || tones.slate;
  const foreground = color === 'text-secondary' ? 'var(--text-secondary)' : `var(--${color})`;
  const background = color === 'text-secondary' ? 'var(--surface-raised)' : `color-mix(in srgb, ${foreground} 12%, transparent)`;
  return (
    <span
      className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold')}
      style={{ backgroundColor: background, color: foreground }}
    >
      {children}
    </span>
  );
}

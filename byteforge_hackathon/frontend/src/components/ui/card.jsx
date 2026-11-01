import { cn } from '../../utils/cn.js';

export function Card({ className, ...props }) {
  return <div className={cn('rounded-2xl border border-line bg-card p-5 shadow-sm', className)} {...props} />;
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    violet: 'bg-violet-100 text-violet-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-700',
    blue: 'bg-sky-100 text-sky-800',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

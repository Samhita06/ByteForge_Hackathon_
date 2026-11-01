import { cn } from '../../utils/cn.js';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate-400',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm placeholder:text-slate-400',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-slate-700', className)} {...props} />;
}

export function Field({ label, htmlFor, children, error }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

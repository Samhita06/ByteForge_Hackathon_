export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div
      className="rounded-2xl border px-6 py-8 text-center"
      style={{
        borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface-card))',
      }}
    >
      <p className="font-medium" style={{ color: 'var(--danger)' }}>
        {message || 'Unable to load this data.'}
      </p>
      {onRetry ? (
        <button type="button" className="mt-3 text-sm font-semibold underline" style={{ color: 'var(--danger)' }} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

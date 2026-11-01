import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Handshake,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../services/apiClient.js';
import { CollaborationForm } from '../features/collaborations/CollaborationForm.jsx';
import { Badge, Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select } from '../components/ui/input.jsx';
import { PageSkeleton, Skeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { ConfirmDialog } from '../components/feedback/confirm-dialog.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { formatDate, formatMoney, labelize } from '../utils/format.js';

const statuses = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function CollaborationsPage() {
  const toast = useToast();
  const client = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('list');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDue, setDeliverableDue] = useState('');

  const listPath = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('q', search);
    const qs = params.toString();
    return `/api/collaborations${qs ? `?${qs}` : ''}`;
  }, [status, search]);

  const list = useQuery({ queryKey: ['collaborations', status, search], queryFn: () => api.get(listPath) });
  const details = useQuery({
    queryKey: ['collaboration', selected],
    queryFn: () => api.get(`/api/collaborations/${selected}`),
    enabled: Boolean(selected),
  });
  const deliverables = useQuery({
    queryKey: ['deliverables', selected],
    queryFn: () => api.get(`/api/deliverables?collaboration_id=${selected}&pageSize=50`),
    enabled: Boolean(selected),
  });

  const create = useMutation({
    mutationFn: (body) => api.post('/api/collaborations', clean(body)),
    onSuccess: () => {
      toast.push('Collaboration saved', 'success');
      client.invalidateQueries({ queryKey: ['collaborations'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      setMode('list');
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const update = useMutation({
    mutationFn: (body) => api.patch(`/api/collaborations/${selected}`, clean(body)),
    onSuccess: () => {
      toast.push('Collaboration updated', 'success');
      client.invalidateQueries({ queryKey: ['collaborations'] });
      client.invalidateQueries({ queryKey: ['collaboration', selected] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      setMode('details');
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/api/collaborations/${id}`),
    onSuccess: () => {
      toast.push('Collaboration deleted', 'success');
      setPendingDelete(null);
      setSelected(null);
      setMode('list');
      client.invalidateQueries({ queryKey: ['collaborations'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const addDeliverable = useMutation({
    mutationFn: () =>
      api.post('/api/deliverables', {
        collaboration_id: selected,
        title: deliverableTitle,
        due_date: deliverableDue || null,
      }),
    onSuccess: () => {
      setDeliverableTitle('');
      setDeliverableDue('');
      toast.push('Deliverable added', 'success');
      client.invalidateQueries({ queryKey: ['deliverables', selected] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const updateDeliverable = useMutation({
    mutationFn: ({ id, status: next }) => api.patch(`/api/deliverables/${id}`, { status: next }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['deliverables', selected] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });

  if (list.isLoading) return <PageSkeleton />;
  if (list.isError) return <ErrorState message={list.error.message} onRetry={list.refetch} />;

  if (mode === 'create') {
    return (
      <Page title="New collaboration" onBack={() => setMode('list')} description="Capture the campaign details and agreed terms.">
        <CollaborationForm
          submitLabel="Create collaboration"
          submitting={create.isPending}
          onSubmit={(values) => create.mutate(values)}
        />
      </Page>
    );
  }

  if (mode === 'edit' && details.data) {
    return (
      <Page title="Edit collaboration" onBack={() => setMode('details')} description="Update the campaign information.">
        <CollaborationForm
          defaultValues={details.data.data}
          submitLabel="Save changes"
          submitting={update.isPending}
          onSubmit={(values) => update.mutate(values)}
        />
      </Page>
    );
  }

  if (mode === 'details' && selected) {
    if (details.isLoading) {
      return (
        <Page title="Collaboration" onBack={() => setMode('list')}>
          <DetailsSkeleton />
        </Page>
      );
    }
    if (details.isError) {
      return (
        <Page title="Collaboration" onBack={() => setMode('list')}>
          <ErrorState message={details.error.message} onRetry={details.refetch} />
        </Page>
      );
    }
    const row = details.data?.data;
    if (!row) {
      return (
        <Page title="Collaboration" onBack={() => setMode('list')}>
          <ErrorState message="This collaboration could not be found." onRetry={details.refetch} />
        </Page>
      );
    }

    return (
      <Page title={row.brand_name} onBack={() => setMode('list')} description={row.campaign_name}>
        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line bg-gradient-to-r from-accent/10 via-accent-2/5 to-transparent p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-accent shadow-sm">
                    <Handshake size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{row.brand_name}</p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-ink sm:text-2xl">{row.campaign_name}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      {row.description || 'No campaign description has been added.'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
              <DetailMetric icon={CircleDollarSign} label="Agreed amount" value={formatMoney(row.agreed_amount, row.currency)} />
              <DetailMetric icon={CalendarDays} label="Campaign deadline" value={formatDate(row.deadline)} />
              <DetailMetric icon={Clock3} label="Start date" value={formatDate(row.start_date)} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4 sm:px-7">
              <Button onClick={() => setMode('edit')}>Edit collaboration</Button>
              <Button variant="danger" onClick={() => setPendingDelete(row.id)}>
                <Trash2 size={15} /> Delete
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Deliverables</h3>
                <p className="mt-1 text-xs text-slate-500">Track the work and update its progress.</p>
              </div>
              <span className="rounded-xl bg-accent/10 p-2 text-accent">
                <FileText size={17} />
              </span>
            </div>
            <form
              className="grid gap-3 rounded-2xl bg-panel p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                addDeliverable.mutate();
              }}
            >
              <Input
                placeholder="e.g. Instagram reel draft"
                aria-label="Deliverable title"
                value={deliverableTitle}
                onChange={(event) => setDeliverableTitle(event.target.value)}
                required
              />
              <Input
                type="date"
                aria-label="Deliverable due date"
                value={deliverableDue}
                onChange={(event) => setDeliverableDue(event.target.value)}
                className="sm:w-44"
              />
              <Button type="submit" disabled={addDeliverable.isPending} className="sm:min-w-28">
                <Plus size={15} />
                {addDeliverable.isPending ? 'Adding…' : 'Add item'}
              </Button>
            </form>

            {deliverables.isLoading ? (
              <div className="mt-5 space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : deliverables.isError ? (
              <div className="mt-5">
                <ErrorState message={deliverables.error.message} onRetry={deliverables.refetch} />
              </div>
            ) : (deliverables.data?.data || []).length === 0 ? (
              <div className="mt-5">
                <InlineEmpty icon={FileText} title="No deliverables yet" detail="Add the first piece of work for this campaign." />
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-line">
                {(deliverables.data?.data || []).map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-panel p-2 text-slate-500">
                        <FileText size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.due_date ? `Due ${formatDate(item.due_date)}` : 'No due date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:pl-4">
                      <StatusBadge status={item.status} />
                      <Select
                        aria-label={`Update status for ${item.title}`}
                        value={item.status}
                        onChange={(event) => updateDeliverable.mutate({ id: item.id, status: event.target.value })}
                        disabled={updateDeliverable.isPending}
                        className="w-full min-w-36 sm:w-auto"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this collaboration?"
          description="Deliverables linked to this deal will also be removed."
          loading={remove.isPending}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => remove.mutate(pendingDelete)}
        />
      </Page>
    );
  }

  const rows = list.data.data || [];
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Partnerships and campaigns</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Collaborations</h2>
          <p className="mt-2 text-sm text-slate-500">Keep brand deals, deliverables, and deadlines organized.</p>
        </div>
        <Button onClick={() => setMode('create')}>
          <Plus size={16} /> New collaboration
        </Button>
      </section>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem] md:items-end">
          <Field label="Search collaborations" htmlFor="collaboration-search">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="collaboration-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by brand or campaign"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Status" htmlFor="collaboration-status">
            <Select id="collaboration-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-ink">{rows.length}</span> collaboration{rows.length === 1 ? '' : 's'}
          </p>
          {search || status ? (
            <button
              type="button"
              className="text-xs font-semibold text-accent hover:underline"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </Card>

      {rows.length === 0 ? (
        search || status ? (
          <EmptyState
            title="No matching collaborations"
            description="Try a different search or clear the current filters."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Start building your partnerships"
            description="Create your first collaboration to organize campaign details, deliverables, and deadlines."
            action={
              <Button onClick={() => setMode('create')}>
                <Plus size={16} /> Create collaboration
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex h-full flex-col p-0 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Handshake size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{row.brand_name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{row.campaign_name}</p>
                    </div>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                {row.description ? <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">{row.description}</p> : null}

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-panel/70 p-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Agreed amount</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{formatMoney(row.agreed_amount, row.currency)}</p>
                  </div>
                  <div className="min-w-0 border-l border-line pl-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Deadline</p>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">{formatDate(row.deadline)}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <p className="text-xs text-slate-500">
                    {row.start_date ? `Started ${formatDate(row.start_date)}` : 'Start date not set'}
                  </p>
                  <Button
                    variant="ghost"
                    className="px-2.5 py-2 text-xs"
                    onClick={() => {
                      setSelected(row.id);
                      setMode('details');
                    }}
                  >
                    View details <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Page({ title, description, onBack, children }) {
  return (
    <div className="space-y-5 lg:space-y-6">
      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-accent"
        onClick={onBack}
      >
        <ArrowLeft size={16} /> Back to collaborations
      </button>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function DetailMetric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-panel p-2.5 text-accent">
        <Icon size={18} />
      </span>
      <dl className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-1 truncate text-sm font-semibold text-ink">{value}</dd>
      </dl>
    </div>
  );
}

function StatusBadge({ status }) {
  const tones = {
    draft: 'slate',
    active: 'green',
    completed: 'blue',
    cancelled: 'rose',
    pending: 'amber',
    in_progress: 'blue',
  };
  return <Badge tone={tones[status] || 'slate'}>{labelize(status)}</Badge>;
}

function InlineEmpty({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-panel/50 px-4 py-5">
      <span className="rounded-lg bg-card p-2 text-slate-500">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56" />
      <Skeleton className="h-72" />
    </div>
  );
}

function clean(values) {
  const next = { ...values };
  ['start_date', 'deadline', 'description'].forEach((key) => {
    if (!next[key]) next[key] = null;
  });
  next.currency = String(next.currency || 'INR').toUpperCase();
  return next;
}

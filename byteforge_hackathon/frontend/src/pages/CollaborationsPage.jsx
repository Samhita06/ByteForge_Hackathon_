import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient.js';
import { CollaborationForm } from '../features/collaborations/CollaborationForm.jsx';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select } from '../components/ui/input.jsx';
import { PageSkeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { ConfirmDialog } from '../components/feedback/confirm-dialog.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { formatDate, formatMoney, labelize } from '../utils/format.js';

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
      client.invalidateQueries({ queryKey: ['deliverables', selected] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const updateDeliverable = useMutation({
    mutationFn: ({ id, status: next }) => api.patch(`/api/deliverables/${id}`, { status: next }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['deliverables', selected] }),
  });

  if (list.isLoading) return <PageSkeleton />;
  if (list.isError) return <ErrorState message={list.error.message} onRetry={list.refetch} />;

  if (mode === 'create') {
    return (
      <Page title="New collaboration" onBack={() => setMode('list')}>
        <CollaborationForm submitLabel="Create deal" submitting={create.isPending} onSubmit={(values) => create.mutate(values)} />
      </Page>
    );
  }

  if (mode === 'edit' && details.data) {
    return (
      <Page title="Edit collaboration" onBack={() => setMode('details')}>
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
    const row = details.data?.data;
    return (
      <Page title={row ? `${row.brand_name}` : 'Collaboration'} onBack={() => setMode('list')}>
        {details.isLoading ? (
          <PageSkeleton />
        ) : (
          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{row.campaign_name}</h2>
                  <p className="mt-1 text-slate-600">{row.description || 'No description yet.'}</p>
                </div>
                <Badge tone="violet">{labelize(row.status)}</Badge>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Agreed amount</dt>
                  <dd className="font-semibold">{formatMoney(row.agreed_amount, row.currency)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Deadline</dt>
                  <dd>{formatDate(row.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Start</dt>
                  <dd>{formatDate(row.start_date)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => setMode('edit')}>Edit</Button>
                <Button variant="danger" onClick={() => setPendingDelete(row.id)}>
                  Delete
                </Button>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold">Deliverables</h3>
              <form
                className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  addDeliverable.mutate();
                }}
              >
                <Input
                  placeholder="Deliverable title"
                  aria-label="Deliverable title"
                  value={deliverableTitle}
                  onChange={(e) => setDeliverableTitle(e.target.value)}
                  required
                />
                <Input type="date" aria-label="Due date" value={deliverableDue} onChange={(e) => setDeliverableDue(e.target.value)} />
                <Button type="submit" disabled={addDeliverable.isPending}>
                  Add
                </Button>
              </form>
              <ul className="mt-4 space-y-2">
                {(deliverables.data?.data || []).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel px-3 py-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-slate-500">Due {formatDate(item.due_date)}</p>
                    </div>
                    <Select value={item.status} onChange={(e) => updateDeliverable.mutate({ id: item.id, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Collaborations</h1>
          <p className="text-sm text-slate-600">Brand deals, deadlines, and agreed payment.</p>
        </div>
        <Button onClick={() => setMode('create')}>New collaboration</Button>
      </div>
      <Card className="grid gap-3 md:grid-cols-2">
        <Field label="Search brand or campaign" htmlFor="search">
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="No collaborations yet" description="Create your first brand deal to connect campaigns, invoices, and content." />
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="text-left"
              onClick={() => {
                setSelected(row.id);
                setMode('details');
              }}
            >
              <Card className="transition hover:border-accent/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{row.brand_name}</p>
                    <p className="text-slate-600">{row.campaign_name}</p>
                  </div>
                  <Badge tone="violet">{labelize(row.status)}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {formatMoney(row.agreed_amount, row.currency)} · due {formatDate(row.deadline)}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Page({ title, onBack, children }) {
  return (
    <div className="space-y-5">
      <button type="button" className="text-sm font-semibold text-accent" onClick={onBack}>
        Back
      </button>
      <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
      {children}
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

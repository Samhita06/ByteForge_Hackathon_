import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/input.jsx';
import { PageSkeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { ConfirmDialog } from '../components/feedback/confirm-dialog.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { formatDate, labelize } from '../utils/format.js';

const emptyForm = {
  title: '',
  description: '',
  platform: 'instagram',
  content_type: 'post',
  scheduled_date: '',
  status: 'idea',
  collaboration_id: '',
};

export function ContentPlannerPage() {
  const toast = useToast();
  const client = useQueryClient();
  const [month, setMonth] = useState(new Date());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const monthKey = format(month, 'yyyy-MM');

  const content = useQuery({
    queryKey: ['content', monthKey],
    queryFn: () => api.get(`/api/content?month=${monthKey}&pageSize=100`),
  });
  const collaborations = useQuery({
    queryKey: ['collaborations'],
    queryFn: () => api.get('/api/collaborations?pageSize=50'),
  });

  const save = useMutation({
    mutationFn: (body) =>
      editingId ? api.patch(`/api/content/${editingId}`, body) : api.post('/api/content', body),
    onSuccess: () => {
      toast.push(editingId ? 'Content updated' : 'Content planned', 'success');
      setForm(emptyForm);
      setEditingId(null);
      client.invalidateQueries({ queryKey: ['content'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/api/content/${id}`),
    onSuccess: () => {
      setPendingDelete(null);
      client.invalidateQueries({ queryKey: ['content'] });
    },
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  if (content.isLoading) return <PageSkeleton />;
  if (content.isError) return <ErrorState message={content.error.message} onRetry={content.refetch} />;

  const items = content.data.data || [];
  const byDate = (day) => items.filter((item) => item.scheduled_date && isSameDay(parseISO(item.scheduled_date), day));

  function submit(event) {
    event.preventDefault();
    save.mutate({
      ...form,
      scheduled_date: form.scheduled_date || null,
      collaboration_id: form.collaboration_id || null,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Content planner</h1>
        <p className="text-sm text-slate-600">This is a planning calendar, not a publishing tool.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{format(month, 'MMMM yyyy')}</h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>
                Prev
              </Button>
              <Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>
                Next
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div key={day.toISOString()} className="min-h-24 rounded-xl border border-line bg-white p-2 text-left">
                <p className="text-xs text-slate-400">{format(day, 'd')}</p>
                {byDate(day).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="mt-1 block w-full truncate rounded-md bg-violet-100 px-1 py-0.5 text-[11px] text-violet-800"
                    onClick={() => {
                      setEditingId(item.id);
                      setForm({
                        title: item.title,
                        description: item.description || '',
                        platform: item.platform,
                        content_type: item.content_type,
                        scheduled_date: item.scheduled_date || '',
                        status: item.status,
                        collaboration_id: item.collaboration_id || '',
                      });
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold">{editingId ? 'Edit content item' : 'Plan content'}</h2>
            <form className="space-y-3" onSubmit={submit}>
              <Field label="Title" htmlFor="title">
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Platform" htmlFor="platform">
                <Select id="platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Content type" htmlFor="content_type">
                <Select
                  id="content_type"
                  value={form.content_type}
                  onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                >
                  <option value="post">Post</option>
                  <option value="reel">Reel</option>
                  <option value="short">Short</option>
                  <option value="video">Video</option>
                  <option value="story">Story</option>
                  <option value="carousel">Carousel</option>
                  <option value="article">Article</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Scheduled date" htmlFor="scheduled_date">
                <Input
                  id="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="idea">Idea</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="published">Marked published (manual)</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              <Field label="Link to collaboration (optional)" htmlFor="collaboration_id">
                <Select
                  id="collaboration_id"
                  value={form.collaboration_id}
                  onChange={(e) => setForm({ ...form, collaboration_id: e.target.value })}
                >
                  <option value="">None</option>
                  {(collaborations.data?.data || []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.brand_name} · {row.campaign_name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
                {editingId ? (
                  <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Upcoming list</h2>
            {items.length === 0 ? (
              <EmptyState title="Nothing planned" description="Add a content item with a date to see it here." />
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-panel p-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {labelize(item.platform)} · {formatDate(item.scheduled_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{labelize(item.status)}</Badge>
                      <Button variant="danger" onClick={() => setPendingDelete(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this content item?"
        description="This only removes the plan. Nothing is posted or unpublished on social networks."
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete)}
      />
    </div>
  );
}

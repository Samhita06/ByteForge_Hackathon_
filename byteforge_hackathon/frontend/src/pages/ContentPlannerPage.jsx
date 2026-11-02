import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/input.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
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

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ContentPlannerPage() {
  const toast = useToast();
  const client = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const savedHandoff =
    isSavedPlannerItem(location.state?.copilotSavedItem) ? location.state.copilotSavedItem : null;
  const [month, setMonth] = useState(() =>
    savedHandoff?.scheduled_date ? parseISO(savedHandoff.scheduled_date) : new Date(),
  );
  const [form, setForm] = useState(() => (savedHandoff ? formFromSavedPlannerItem(savedHandoff) : emptyForm));
  const [editingId, setEditingId] = useState(() => savedHandoff?.id || null);
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
      if (editingId === pendingDelete) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setPendingDelete(null);
      toast.push('Content plan deleted', 'success');
      client.invalidateQueries({ queryKey: ['content'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });

  useEffect(() => {
    if (!savedHandoff) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, savedHandoff]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  if (content.isLoading) return <PlannerSkeleton />;
  if (content.isError) return <ErrorState message={content.error.message} onRetry={content.refetch} />;

  const items = content.data.data || [];
  const itemsByDate = new Map();
  items.forEach((item) => {
    if (!item.scheduled_date) return;
    const dateKey = item.scheduled_date.slice(0, 10);
    itemsByDate.set(dateKey, [...(itemsByDate.get(dateKey) || []), item]);
  });

  function startCreate(date = '') {
    if (date) {
      const selectedDate = parseISO(date);
      if (!isSameMonth(selectedDate, month)) setMonth(selectedDate);
    }
    setEditingId(null);
    setForm({ ...emptyForm, scheduled_date: date });
  }

  function editItem(item) {
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
  }

  function submit(event) {
    event.preventDefault();
    save.mutate({
      ...form,
      scheduled_date: form.scheduled_date || null,
      collaboration_id: form.collaboration_id || null,
    });
  }

  const collaborationOptions = collaborations.data?.data || [];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Plan your publishing rhythm</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Content planner</h2>
          <p className="mt-2 text-sm text-slate-500">Organize ideas and scheduled posts. ByteForge does not publish to social networks.</p>
        </div>
        <Button onClick={() => startCreate()}>
          <Plus size={16} /> Plan content
        </Button>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1fr)]">
        <Card className="min-w-0 overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
                <CalendarDays size={18} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">{format(month, 'MMMM yyyy')}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{items.length} planned item(s) this month</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                className="px-2.5"
                aria-label="Previous month"
                onClick={() => setMonth(addMonths(month, -1))}
              >
                <ChevronLeft size={17} />
              </Button>
              <Button variant="secondary" className="px-3 text-xs" onClick={() => setMonth(new Date())}>
                Today
              </Button>
              <Button
                variant="secondary"
                className="px-2.5"
                aria-label="Next month"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto p-3 sm:p-4">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {weekDays.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-1.5">
                {days.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayItems = itemsByDate.get(dateKey) || [];
                  const selectedDay = form.scheduled_date && isSameDay(parseISO(form.scheduled_date), day);
                  return (
                    <div
                      key={dateKey}
                      className={`min-h-28 rounded-xl border p-1.5 transition sm:p-2 ${
                        selectedDay ? 'border-accent bg-accent/5' : 'border-line bg-card'
                      } ${!isSameMonth(day, month) ? 'opacity-55' : ''}`}
                    >
                      <button
                        type="button"
                        aria-label={`Plan content for ${format(day, 'EEEE, d MMMM yyyy')}`}
                        onClick={() => startCreate(dateKey)}
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-medium transition ${
                          isToday(day)
                            ? 'bg-accent text-slate-950'
                            : 'text-slate-500 hover:bg-panel hover:text-ink'
                        }`}
                      >
                        {format(day, 'd')}
                      </button>
                      <div className="mt-1 space-y-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            title={`${item.title} · ${labelize(item.platform)} · ${labelize(item.status)}`}
                            onClick={() => editItem(item)}
                            className="block w-full rounded-md border-l-2 border-accent bg-accent/10 px-1.5 py-1 text-left transition hover:bg-accent/15"
                          >
                            <span className="block truncate text-[11px] font-semibold text-ink">{item.title}</span>
                            <span className="block truncate text-[9px] text-slate-500">
                              {labelize(item.platform)} · {labelize(item.status)}
                            </span>
                          </button>
                        ))}
                        {dayItems.length > 3 ? (
                          <p className="px-1 text-[10px] font-medium text-slate-500">+{dayItems.length - 3} more</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-slate-500 sm:px-5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Select a date to start planning, or select an event to edit it.
          </div>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Card className="p-4 sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">{editingId ? 'Edit content' : 'Plan content'}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {form.scheduled_date ? `Scheduled for ${formatDate(form.scheduled_date)}` : 'Add an idea or schedule a post.'}
                </p>
              </div>
              <span className="rounded-xl bg-accent/10 p-2 text-accent">
                <FileText size={17} />
              </span>
            </div>
            <form className="space-y-3.5" onSubmit={submit}>
              <Field label="Title" htmlFor="title">
                <Input
                  id="title"
                  placeholder="e.g. Behind the scenes"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Platform" htmlFor="platform">
                  <Select
                    id="platform"
                    value={form.platform}
                    onChange={(event) => setForm({ ...form, platform: event.target.value })}
                  >
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
                    onChange={(event) => setForm({ ...form, content_type: event.target.value })}
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Scheduled date" htmlFor="scheduled_date">
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={form.scheduled_date}
                    onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })}
                  />
                </Field>
                <Field label="Status" htmlFor="content-status">
                  <Select
                    id="content-status"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                  >
                    <option value="idea">Idea</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="published">Marked published (manual)</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </Field>
              </div>
              <Field label="Collaboration (optional)" htmlFor="collaboration_id">
                <Select
                  id="collaboration_id"
                  value={form.collaboration_id}
                  onChange={(event) => setForm({ ...form, collaboration_id: event.target.value })}
                  disabled={collaborations.isLoading || collaborations.isError}
                >
                  <option value="">No collaboration</option>
                  {collaborationOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.brand_name} · {row.campaign_name}
                    </option>
                  ))}
                </Select>
              </Field>
              {collaborations.isError ? (
                <div role="status" className="flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--danger)' }}>
                  <span>You can still save content without linking a campaign.</span>
                  <button type="button" className="shrink-0 font-semibold underline" onClick={() => collaborations.refetch()}>
                    Retry
                  </button>
                </div>
              ) : null}
              <Field label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Add notes or a draft brief."
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </Field>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Save content'}
                </Button>
                {editingId || form.scheduled_date ? (
                  <Button variant="secondary" onClick={() => startCreate()}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">This month</h3>
                <p className="mt-1 text-xs text-slate-500">Ideas and posts in {format(month, 'MMMM')}</p>
              </div>
              <span className="rounded-xl bg-panel p-2 text-slate-500">
                <Clock3 size={16} />
              </span>
            </div>
            {items.length === 0 ? (
              <EmptyState
                title="Nothing planned yet"
                description="Choose a date on the calendar or start with an idea."
                action={
                  <Button variant="secondary" onClick={() => startCreate()}>
                    <Plus size={15} /> Add content
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-line bg-panel/60 p-3 transition hover:border-accent/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => editItem(item)}>
                        <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.scheduled_date ? formatDate(item.scheduled_date) : 'No date set'}
                          {item.content_type ? ` · ${labelize(item.content_type)}` : ''}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        className="shrink-0 p-2 text-slate-500"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setPendingDelete(item.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PlatformBadge platform={item.platform} />
                      <StatusBadge status={item.status} />
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
        description="This removes the plan from ByteForge. It does not publish or remove anything on social networks."
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => remove.mutate(pendingDelete)}
      />
    </div>
  );
}

function PlatformBadge({ platform }) {
  const tones = {
    instagram: 'violet',
    youtube: 'rose',
    tiktok: 'slate',
    linkedin: 'blue',
    other: 'slate',
  };
  return <Badge tone={tones[platform] || 'slate'}>{labelize(platform)}</Badge>;
}

function StatusBadge({ status }) {
  const tones = {
    idea: 'slate',
    scheduled: 'blue',
    in_progress: 'amber',
    published: 'green',
    cancelled: 'rose',
  };
  return <Badge tone={tones[status] || 'slate'}>{labelize(status)}</Badge>;
}

function PlannerSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading content planner" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,1fr)]">
        <Skeleton className="h-[42rem]" />
        <div className="space-y-4">
          <Skeleton className="h-[34rem]" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}

function isSavedPlannerItem(item) {
  const isUuid = (value) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const isDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = parseISO(value);
    return !Number.isNaN(parsed.getTime()) && format(parsed, 'yyyy-MM-dd') === value;
  };

  return Boolean(
    item &&
      typeof item === 'object' &&
      isUuid(item.id) &&
      typeof item.title === 'string' &&
      item.title.trim().length > 0 &&
      item.title.length <= 160 &&
      ['instagram', 'youtube', 'tiktok', 'linkedin', 'other'].includes(item.platform) &&
      ['post', 'reel', 'short', 'video', 'story', 'carousel', 'article', 'other'].includes(item.content_type) &&
      item.status === 'idea' &&
      (item.description === null || typeof item.description === 'string') &&
      (item.scheduled_date === null || isDate(item.scheduled_date)) &&
      (item.collaboration_id === null || isUuid(item.collaboration_id)),
  );
}

function formFromSavedPlannerItem(item) {
  return {
    title: item.title,
    description: item.description || '',
    platform: item.platform,
    content_type: item.content_type,
    scheduled_date: item.scheduled_date || '',
    status: item.status,
    collaboration_id: item.collaboration_id || '',
  };
}

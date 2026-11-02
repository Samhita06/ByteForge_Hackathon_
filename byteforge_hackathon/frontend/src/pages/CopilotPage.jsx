import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select, Textarea } from '../components/ui/input.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

const priorityTones = { high: 'rose', medium: 'amber', low: 'blue' };
const sourceTones = { collaboration: 'violet', deliverable: 'blue', content: 'green', invoice: 'amber' };
const platforms = ['instagram', 'youtube', 'tiktok', 'linkedin', 'other'];
const contentTypes = ['post', 'reel', 'short', 'video', 'story', 'carousel', 'article', 'other'];

export function CopilotPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const saveInFlight = useRef(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [idea, setIdea] = useState(null);
  const recommendationsKey = ['ai-recommendations', user.id];
  const recommendationsQuery = useQuery({
    queryKey: recommendationsKey,
    queryFn: () => api.get('/api/ai/recommendations'),
  });
  const generate = useMutation({
    mutationFn: () => api.post('/api/ai/recommendations', {}),
    onError: (err) => toast.push(err.message, 'error'),
    onSuccess: (response) => {
      queryClient.setQueryData(recommendationsKey, response);
      toast.push('Recommendations updated', 'success');
    },
  });
  const saveIdea = useMutation({
    mutationFn: async (body) => {
      const response = await api.post('/api/content', body);
      if (!isSavedContentItem(response?.data)) {
        throw new Error('The saved content response was invalid. Check the Planner before trying again.');
      }
      return response.data;
    },
    onError: (err) => toast.push(err.message, 'error'),
    onSettled: () => {
      saveInFlight.current = false;
    },
    onSuccess: (savedItem) => {
      queryClient.invalidateQueries({ queryKey: ['content'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedRecommendation(null);
      setIdea(null);
      toast.push('Planner idea saved', 'success');
      navigate('/planner', { state: { copilotSavedItem: savedItem } });
    },
  });

  if (recommendationsQuery.isLoading) return <CopilotSkeleton />;
  if (recommendationsQuery.isError) {
    return <ErrorState message={recommendationsQuery.error.message} onRetry={recommendationsQuery.refetch} />;
  }

  const payload = recommendationsQuery.data?.data;
  const recommendations = Array.isArray(payload?.recommendations)
    ? payload.recommendations.filter((item) => item && typeof item === 'object')
    : [];
  const isAi = payload?.source === 'ai';

  function reviewRecommendation(item) {
    const title = safeText(item.title).trim().slice(0, 160);
    const explanation = safeText(item.explanation).trim();
    const nextAction = safeText(item.suggestedNextAction).trim();
    const description = [
      explanation ? `Recommendation:\n${explanation}` : '',
      nextAction ? `Suggested next action:\n${nextAction}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 2000);
    setSelectedRecommendation(item);
    setIdea({
      title,
      description,
      platform: 'instagram',
      content_type: 'post',
      scheduled_date: '',
    });
  }

  function closeReview() {
    if (saveIdea.isPending || saveInFlight.current) return;
    setSelectedRecommendation(null);
    setIdea(null);
  }

  function submitIdea(event) {
    event.preventDefault();
    const title = idea?.title.trim() || '';
    const description = idea?.description || '';
    if (
      saveInFlight.current ||
      !title ||
      title.length > 160 ||
      description.length > 2000 ||
      !platforms.includes(idea.platform) ||
      !contentTypes.includes(idea.content_type)
    ) {
      return;
    }

    saveInFlight.current = true;
    saveIdea.mutate({
      title,
      description: description || null,
      platform: idea.platform,
      content_type: idea.content_type,
      scheduled_date: idea.scheduled_date || null,
      status: 'idea',
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Grounded in your saved workspace data</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">AI Creator Copilot</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Get practical next steps from your profile, collaborations, deadlines, content, and invoices. Copilot
            does not invent audience metrics or earnings.
          </p>
        </div>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <Sparkles size={16} />
          {generate.isPending ? 'Generating…' : payload ? 'Refresh recommendations' : 'Generate recommendations'}
        </Button>
      </section>

      {payload ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isAi ? 'bg-accent/10 text-accent' : 'bg-accent-2/10 text-accent-2'
                }`}
              >
                {isAi ? <Sparkles size={17} /> : <ListChecks size={17} />}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">Saved recommendations</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {recommendations.length} suggestion{recommendations.length === 1 ? '' : 's'}
                  {payload.generatedAt ? ` · Updated ${formatGeneratedAt(payload.generatedAt)}` : ''}
                </p>
              </div>
              <Badge tone={isAi ? 'violet' : 'green'}>
                {isAi ? 'Gemini AI' : 'Rule-based fallback'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">Saved for your account</p>
          </div>

          {payload.warning ? (
            <div
              role="status"
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--warning) 10%, var(--surface-card))',
                color: 'var(--warning)',
              }}
            >
              <span className="font-semibold">Using fallback suggestions.</span> {payload.warning}
            </div>
          ) : null}

          {recommendations.length === 0 ? (
            <EmptyState
              title="No suggestions in this saved batch"
              description="Generate a fresh batch to check your latest creator-workspace records."
              action={
                <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                  <Sparkles size={15} /> Generate recommendations
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recommendations.map((item, index) => (
                <RecommendationCard
                  key={`${safeText(item.title) || 'recommendation'}-${index}`}
                  item={item}
                  index={index}
                  onSave={() => reviewRecommendation(item)}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <Card className="p-0">
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)] lg:items-center">
            <div>
              <span className="mb-4 inline-flex rounded-2xl bg-accent/10 p-3 text-accent">
                <Lightbulb size={22} />
              </span>
              <h3 className="text-lg font-semibold text-ink">Your creator workspace, turned into next steps</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                No saved recommendations yet. Generate guidance from your existing records; if Gemini is unavailable,
                ByteForge uses a clearly labeled rule-based fallback.
              </p>
              <Button className="mt-5" onClick={() => generate.mutate()} disabled={generate.isPending}>
                <Sparkles size={16} />
                {generate.isPending ? 'Generating…' : 'Generate recommendations'}
              </Button>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What it uses</p>
              <ul className="mt-4 space-y-3">
                {['Saved collaborations and deadlines', 'Planned content and profile preferences', 'Pending invoices and payment status'].map(
                  (label) => (
                    <li key={label} className="flex items-start gap-2.5 text-sm text-ink">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-2" />
                      {label}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
      {selectedRecommendation && idea ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="planner-idea-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeReview();
            }}
            className="my-auto w-full max-w-2xl rounded-2xl border border-line bg-card p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5">
              <p className="text-sm font-medium text-slate-500">Review before saving</p>
              <h2 id="planner-idea-title" className="mt-1 text-xl font-bold text-ink">
                Save as Planner Idea
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This is a business recommendation, not a finished caption. Edit the idea details before adding it to
                your Planner.
              </p>
            </div>
            <form className="space-y-4" onSubmit={submitIdea}>
              <Field label="Idea title" htmlFor="planner-idea-title-input">
                <Input
                  autoFocus
                  id="planner-idea-title-input"
                  value={idea.title}
                  onChange={(event) => setIdea({ ...idea, title: event.target.value })}
                  maxLength={160}
                  required
                />
              </Field>
              <Field label="Description and next step" htmlFor="planner-idea-description">
                <Textarea
                  id="planner-idea-description"
                  rows={6}
                  value={idea.description}
                  onChange={(event) => setIdea({ ...idea, description: event.target.value })}
                  maxLength={2000}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Platform" htmlFor="planner-idea-platform">
                  <Select
                    id="planner-idea-platform"
                    value={idea.platform}
                    onChange={(event) => setIdea({ ...idea, platform: event.target.value })}
                    required
                  >
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {labelizePriority(platform)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Content type" htmlFor="planner-idea-content-type">
                  <Select
                    id="planner-idea-content-type"
                    value={idea.content_type}
                    onChange={(event) => setIdea({ ...idea, content_type: event.target.value })}
                    required
                  >
                    {contentTypes.map((contentType) => (
                      <option key={contentType} value={contentType}>
                        {labelizePriority(contentType)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Schedule date (optional)" htmlFor="planner-idea-date">
                  <Input
                    id="planner-idea-date"
                    type="date"
                    value={idea.scheduled_date}
                    onChange={(event) => setIdea({ ...idea, scheduled_date: event.target.value })}
                  />
                </Field>
              </div>
              {saveIdea.isError ? (
                <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>
                  {saveIdea.error.message}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={closeReview} disabled={saveIdea.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveIdea.isPending || !idea.title.trim()}>
                  {saveIdea.isPending ? 'Saving idea…' : 'Save as Planner Idea'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function RecommendationCard({ item, index, onSave }) {
  return (
    <Card className="flex h-full flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <span className="text-xs font-bold">{String(index + 1).padStart(2, '0')}</span>
          </span>
          <h3 className="pt-1 text-sm font-semibold leading-5 text-ink sm:text-base">
            {safeText(item.title) || 'Untitled recommendation'}
          </h3>
        </div>
        <Badge tone={priorityTones[item.priority] || 'slate'}>{labelizePriority(item.priority)}</Badge>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-500">
        {safeText(item.explanation) || 'No explanation was provided.'}
      </p>

      <div className="mt-5 rounded-xl border border-accent/15 bg-accent/5 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Suggested next action</p>
        <p className="mt-1.5 text-sm font-medium leading-5 text-ink">
          {safeText(item.suggestedNextAction) || 'Review your workspace and choose a next step.'}
        </p>
      </div>

      {item.sourceRecord ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={14} />
            <span>
              Source: {labelizePriority(item.sourceRecord.type)}
              {item.sourceRecord.id ? (
                <> · <span title={item.sourceRecord.id}>record {String(item.sourceRecord.id).slice(0, 8)}</span></>
              ) : null}
            </span>
          </div>
          <Badge tone={sourceTones[item.sourceRecord.type] || 'slate'}>
            {labelizePriority(item.sourceRecord.type)}
          </Badge>
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-slate-500">
          <CheckCircle2 size={14} className="text-accent-2" />
          Based on your saved workspace setup
        </div>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <Button variant="secondary" className="w-full sm:w-auto" onClick={onSave}>
          <Lightbulb size={15} />
          Save as Planner Idea
        </Button>
      </div>
    </Card>
  );
}

function CopilotSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading saved recommendations" aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    </div>
  );
}

function formatGeneratedAt(value) {
  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

function labelizePriority(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeText(value) {
  return typeof value === 'string' ? value : '';
}

function isSavedContentItem(item) {
  return Boolean(
    item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.title === 'string' &&
      platforms.includes(item.platform) &&
      contentTypes.includes(item.content_type) &&
      item.status === 'idea' &&
      (item.description === null || typeof item.description === 'string') &&
      (item.scheduled_date === null || typeof item.scheduled_date === 'string'),
  );
}

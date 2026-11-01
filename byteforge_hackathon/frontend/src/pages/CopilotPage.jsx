import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock3, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { useAuth } from '../features/auth/AuthProvider.jsx';

const priorityTones = { high: 'rose', medium: 'amber', low: 'blue' };
const sourceTones = { collaboration: 'violet', deliverable: 'blue', content: 'green', invoice: 'amber' };

export function CopilotPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  if (recommendationsQuery.isLoading) return <CopilotSkeleton />;
  if (recommendationsQuery.isError) {
    return <ErrorState message={recommendationsQuery.error.message} onRetry={recommendationsQuery.refetch} />;
  }

  const payload = recommendationsQuery.data?.data;
  const recommendations = payload?.recommendations || [];
  const isAi = payload?.source === 'ai';

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
                <RecommendationCard key={`${item.title}-${index}`} item={item} index={index} />
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
    </div>
  );
}

function RecommendationCard({ item, index }) {
  return (
    <Card className="flex h-full flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <span className="text-xs font-bold">{String(index + 1).padStart(2, '0')}</span>
          </span>
          <h3 className="pt-1 text-sm font-semibold leading-5 text-ink sm:text-base">{item.title}</h3>
        </div>
        <Badge tone={priorityTones[item.priority] || 'slate'}>{labelizePriority(item.priority)}</Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{item.explanation}</p>

      <div className="mt-5 rounded-xl border border-accent/15 bg-accent/5 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Suggested next action</p>
        <p className="mt-1.5 text-sm font-medium leading-5 text-ink">{item.suggestedNextAction}</p>
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

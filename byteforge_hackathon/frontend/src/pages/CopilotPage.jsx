import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { useToast } from '../components/feedback/toast.jsx';

const tones = { high: 'rose', medium: 'amber', low: 'blue' };

export function CopilotPage() {
  const toast = useToast();
  const generate = useMutation({
    mutationFn: () => api.post('/api/ai/recommendations', {}),
    onError: (err) => toast.push(err.message, 'error'),
  });

  const payload = generate.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">AI Creator Copilot</h1>
          <p className="text-sm text-slate-600">
            Suggestions are generated from your saved profile, deals, deadlines, content, and invoices. Copilot never
            invents views, audience size, or earnings.
          </p>
        </div>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <Sparkles size={16} />
          {generate.isPending ? 'Generating…' : 'Generate recommendations'}
        </Button>
      </div>

      {payload?.warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {payload.warning}
        </div>
      ) : null}

      {payload ? (
        <div className="space-y-4">
          <Badge tone={payload.source === 'ai' ? 'violet' : 'slate'}>
            {payload.source === 'ai' ? 'AI-generated suggestions' : 'Rule-based suggestions'}
          </Badge>
          {payload.recommendations.map((item, index) => (
            <Card key={`${item.title}-${index}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-ink">{item.title}</h2>
                <Badge tone={tones[item.priority] || 'slate'}>{item.priority}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.explanation}</p>
              <p className="mt-3 text-sm font-medium text-ink">Next action: {item.suggestedNextAction}</p>
              {item.sourceRecord ? (
                <p className="mt-2 text-xs text-slate-500">
                  Source: {item.sourceRecord.type} {item.sourceRecord.id}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            Generate a batch of next actions after you have saved some collaborations, content, or invoices. If Gemini
            is unavailable, ByteForge falls back to a deterministic engine and labels it clearly.
          </p>
        </Card>
      )}
    </div>
  );
}

import { buildCreatorContext } from './context.builder.js';
import { generateWithGemini } from './gemini.client.js';
import { buildRuleBasedRecommendations } from './ruleEngine.js';
import { throwIfDbError } from '../../shared/utils/db.js';
import { Errors } from '../../shared/errors/AppError.js';

const buckets = new Map();

function allowRequest(userId) {
  const now = Date.now();
  const current = buckets.get(userId) || [];
  const recent = current.filter((ts) => now - ts < 60_000);
  if (recent.length >= 5) return false;
  recent.push(now);
  buckets.set(userId, recent);
  return true;
}

export async function createRecommendations(supabase, user) {
  if (!allowRequest(user.id)) {
    throw Errors.validation('Too many Copilot requests. Please wait a minute.');
  }

  const context = await buildCreatorContext(supabase, user);
  let source = 'rule-based';
  let recommendations = buildRuleBasedRecommendations(context);
  let warning = 'Gemini is not configured, so these suggestions are rule-based and use only saved workspace records.';

  try {
    const generated = await generateWithGemini(context);
    if (generated?.length) {
      source = 'ai';
      recommendations = generated;
      warning = null;
    }
  } catch (err) {
    warning = 'The AI provider was unavailable or over quota. Showing rule-based suggestions from saved records.';
    recommendations = buildRuleBasedRecommendations(context);
    source = 'rule-based';
    console.error('[byteforge] gemini fallback', err.message);
  }

  const payload = {
    source,
    warning,
    recommendations,
    generatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('ai_recommendations').insert({
    user_id: user.id,
    recommendation: payload,
    source_context: {
      collaborationIds: context.activeCollaborations.map((row) => row.id),
      invoiceIds: context.pendingInvoices.map((row) => row.id),
    },
    status: 'pending',
  });
  throwIfDbError(error);

  return payload;
}

export async function latestRecommendation(supabase, userId) {
  const { data, error } = await supabase
    .from('ai_recommendations')
    .select('recommendation')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfDbError(error);
  return data?.recommendation ?? null;
}

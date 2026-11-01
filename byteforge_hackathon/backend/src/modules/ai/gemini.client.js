import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

const SYSTEM_PROMPT = `You are ByteForge Copilot, a creator-business assistant.
Use ONLY the JSON context provided. Do not invent analytics, audience size, CPM, views, or earnings.
Do not claim that posts were published to social networks.
If a field is missing, say that the data is not in the workspace.
Return JSON with shape:
{"recommendations":[{"title":"","explanation":"","priority":"high|medium|low","sourceRecord":{"type":"collaboration|deliverable|content|invoice","id":""}|null,"suggestedNextAction":""}]}
Return at most 6 recommendations.`;

export async function generateWithGemini(context) {
  if (!env.GEMINI_API_KEY) return null;
  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: { temperature: 0.4, maxOutputTokens: 1200, responseMimeType: 'application/json' },
  });
  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: JSON.stringify(context) },
  ]);
  const text = result.response.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.recommendations)) return null;
  return parsed.recommendations.slice(0, 6).map((item) => ({
    title: String(item.title || 'Suggestion').slice(0, 120),
    explanation: String(item.explanation || '').slice(0, 500),
    priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    sourceRecord: item.sourceRecord || null,
    suggestedNextAction: String(item.suggestedNextAction || '').slice(0, 240),
  }));
}

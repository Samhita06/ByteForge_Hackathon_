import { describe, expect, it, vi } from 'vitest';
import { latestRecommendation } from '../modules/ai/ai.service.js';

function createRecommendationQuery(result) {
  const query = {
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    }),
  };

  return { supabase, query };
}

describe('latest AI recommendation', () => {
  it('returns the latest recommendation payload for the authenticated user', async () => {
    const recommendation = {
      source: 'rule-based',
      warning: 'Gemini is not configured.',
      recommendations: [{ title: 'Plan content' }],
      generatedAt: '2026-11-01T10:00:00.000Z',
    };
    const { supabase, query } = createRecommendationQuery({
      data: { recommendation },
      error: null,
    });

    await expect(latestRecommendation(supabase, 'user-1')).resolves.toEqual(recommendation);
    expect(supabase.from).toHaveBeenCalledWith('ai_recommendations');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the user has no saved recommendations', async () => {
    const { supabase } = createRecommendationQuery({ data: null, error: null });
    await expect(latestRecommendation(supabase, 'user-1')).resolves.toBeNull();
  });
});

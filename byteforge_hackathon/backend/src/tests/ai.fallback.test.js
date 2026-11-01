import { describe, expect, it } from 'vitest';
import { buildRuleBasedRecommendations } from '../modules/ai/ruleEngine.js';

describe('AI unavailable fallback', () => {
  it('builds suggestions from saved records only', () => {
    const recs = buildRuleBasedRecommendations({
      profile: { niche: 'skincare', primary_platform: 'instagram' },
      activeCollaborations: [
        {
          id: 'c1',
          brand_name: 'Glow Co',
          campaign_name: 'Serum',
          deadline: '2000-01-01',
          status: 'active',
        },
      ],
      upcomingDeadlines: [{ id: 'd1', title: 'Reel', due_date: '2000-01-02', status: 'pending' }],
      plannedContent: [],
      pendingInvoices: [
        { id: 'i1', invoice_number: 'INV-1', amount: 1000, currency: 'INR', status: 'sent' },
      ],
      recentActivity: [],
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((item) => item.sourceRecord?.id === 'c1')).toBe(true);
    expect(recs.some((item) => item.title.includes('INV-1'))).toBe(true);
    expect(recs.every((item) => item.explanation)).toBe(true);
  });
});

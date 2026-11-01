import { describe, expect, it, vi } from 'vitest';
import { createAlertsService } from '../modules/alerts/alerts.service.js';

const userId = 'user-creator';

function createRepository({
  deliverables = [],
  content = [],
  invoices = [],
} = {}) {
  return {
    listOverdueDeliverables: vi.fn().mockResolvedValue(deliverables),
    listUpcomingContent: vi.fn().mockResolvedValue(content),
    listOverdueInvoices: vi.fn().mockResolvedValue(invoices),
  };
}

describe('alerts service', () => {
  it('uses UTC date boundaries and maps the three supported categories', async () => {
    const repository = createRepository({
      deliverables: [{ id: 'd1', title: 'Send draft', due_date: '2026-11-01' }],
      content: [{ id: 'c1', title: 'Publish short', scheduled_date: '2026-11-09' }],
      invoices: [{ id: 'i1', invoice_number: 'BF-42', due_date: '2026-10-30' }],
    });
    const service = createAlertsService({
      alertsRepository: repository,
      clock: () => new Date('2026-11-02T00:15:00+05:30'),
    });

    await expect(service.list({}, userId)).resolves.toEqual([
      {
        id: 'invoice:i1',
        type: 'invoice_overdue',
        severity: 'high',
        title: 'Overdue invoice',
        message: 'Invoice BF-42 is unpaid and overdue.',
        relatedRecordId: 'i1',
        date: '2026-10-30',
      },
      {
        id: 'deliverable:d1',
        type: 'deliverable_overdue',
        severity: 'high',
        title: 'Overdue deliverable',
        message: 'Send draft is overdue.',
        relatedRecordId: 'd1',
        date: '2026-11-01',
      },
      {
        id: 'content:c1',
        type: 'content_upcoming',
        severity: 'medium',
        title: 'Upcoming content',
        message: 'Publish short is scheduled soon.',
        relatedRecordId: 'c1',
        date: '2026-11-09',
      },
    ]);
    expect(repository.listOverdueDeliverables).toHaveBeenCalledWith({}, userId, '2026-11-01');
    expect(repository.listUpcomingContent).toHaveBeenCalledWith(
      {},
      userId,
      '2026-11-01',
      '2026-11-08',
    );
    expect(repository.listOverdueInvoices).toHaveBeenCalledWith({}, userId, '2026-11-01');
  });

  it('sorts by severity, date, type, and record id deterministically', async () => {
    const repository = createRepository({
      deliverables: [
        { id: 'd2', title: 'Later', due_date: '2026-11-01' },
        { id: 'd1', title: 'Earlier', due_date: '2026-10-31' },
      ],
      content: [
        { id: 'c1', title: 'Soon', scheduled_date: '2026-10-30' },
        { id: 'c2', title: 'Also soon', scheduled_date: '2026-10-30' },
      ],
      invoices: [{ id: 'i1', invoice_number: 'BF-1', due_date: '2026-10-31' }],
    });
    const service = createAlertsService({
      alertsRepository: repository,
      clock: () => new Date('2026-11-02T12:00:00Z'),
    });

    const alerts = await service.list({}, userId);

    expect(alerts.map(({ id }) => id)).toEqual([
      'deliverable:d1',
      'invoice:i1',
      'deliverable:d2',
      'content:c1',
      'content:c2',
    ]);
  });

  it('returns an empty list when there are no qualifying records', async () => {
    const service = createAlertsService({
      alertsRepository: createRepository(),
      clock: () => new Date('2026-11-02T12:00:00Z'),
    });

    await expect(service.list({}, userId)).resolves.toEqual([]);
  });

  it('limits the combined result to the highest-priority 50 alerts', async () => {
    const deliverables = Array.from({ length: 60 }, (_, index) => ({
      id: `d${String(index).padStart(2, '0')}`,
      title: 'Overdue item',
      due_date: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
    }));
    const content = Array.from({ length: 60 }, (_, index) => ({
      id: `c${String(index).padStart(2, '0')}`,
      title: 'Upcoming item',
      scheduled_date: '2026-11-04',
    }));
    const service = createAlertsService({
      alertsRepository: createRepository({ deliverables, content }),
      clock: () => new Date('2026-11-02T12:00:00Z'),
    });

    const alerts = await service.list({}, userId);

    expect(alerts).toHaveLength(50);
    expect(alerts.every((alert) => alert.severity === 'high')).toBe(true);
    expect(alerts[0].date).toBe('2026-10-01');
  });

  it('fails the whole result when any category query rejects', async () => {
    const repository = createRepository();
    repository.listUpcomingContent.mockRejectedValue(new Error('database unavailable'));
    const service = createAlertsService({
      alertsRepository: repository,
      clock: () => new Date('2026-11-02T12:00:00Z'),
    });

    await expect(service.list({}, userId)).rejects.toThrow('database unavailable');
  });
});

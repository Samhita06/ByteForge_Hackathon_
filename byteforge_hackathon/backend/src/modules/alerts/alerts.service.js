import * as repository from './alerts.repository.js';

const MAX_ALERTS = 50;
const SEVERITY_ORDER = { high: 0, medium: 1 };

function utcDateRange(clock) {
  const instant = new Date(clock());
  if (!Number.isFinite(instant.getTime())) {
    throw new TypeError('Alerts clock must return a valid date.');
  }

  const todayStart = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
  );
  const today = new Date(todayStart).toISOString().slice(0, 10);
  const endDateExclusive = new Date(todayStart + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { today, endDateExclusive };
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareAlerts(left, right) {
  return (
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
    compareStrings(left.date, right.date) ||
    compareStrings(left.type, right.type) ||
    compareStrings(left.relatedRecordId, right.relatedRecordId)
  );
}

export function createAlertsService({ alertsRepository = repository, clock = () => new Date() } = {}) {
  return {
    async list(supabase, userId) {
      const { today, endDateExclusive } = utcDateRange(clock);
      const [deliverables, content, invoices] = await Promise.all([
        alertsRepository.listOverdueDeliverables(supabase, userId, today),
        alertsRepository.listUpcomingContent(supabase, userId, today, endDateExclusive),
        alertsRepository.listOverdueInvoices(supabase, userId, today),
      ]);

      const alerts = [
        ...deliverables.map((item) => ({
          id: `deliverable:${item.id}`,
          type: 'deliverable_overdue',
          severity: 'high',
          title: 'Overdue deliverable',
          message: `${item.title} is overdue.`,
          relatedRecordId: item.id,
          date: item.due_date,
        })),
        ...content.map((item) => ({
          id: `content:${item.id}`,
          type: 'content_upcoming',
          severity: 'medium',
          title: 'Upcoming content',
          message: `${item.title} is scheduled soon.`,
          relatedRecordId: item.id,
          date: item.scheduled_date,
        })),
        ...invoices.map((item) => ({
          id: `invoice:${item.id}`,
          type: 'invoice_overdue',
          severity: 'high',
          title: 'Overdue invoice',
          message: `Invoice ${item.invoice_number} is unpaid and overdue.`,
          relatedRecordId: item.id,
          date: item.due_date,
        })),
      ];

      alerts.sort(compareAlerts);
      return alerts.slice(0, MAX_ALERTS);
    },
  };
}

export const alertsService = createAlertsService();

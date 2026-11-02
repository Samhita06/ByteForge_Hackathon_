import * as repository from './alerts.repository.js';

const MAX_ALERTS = 50;
const SEVERITY_ORDER = { high: 0, medium: 1 };

function addUtcDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function utcDateRange(clock) {
  const instant = new Date(clock());
  if (!Number.isFinite(instant.getTime())) {
    throw new TypeError('Alerts clock must return a valid date.');
  }

  const today = instant.toISOString().slice(0, 10);
  return {
    today,
    deadlineEndDateExclusive: addUtcDays(today, 4),
    contentEndDateExclusive: addUtcDays(today, 7),
  };
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
      const { today, deadlineEndDateExclusive, contentEndDateExclusive } = utcDateRange(clock);
      const [collaborations, deliverables, content, invoices] = await Promise.all([
        alertsRepository.listUpcomingCollaborationDeadlines(
          supabase,
          userId,
          today,
          deadlineEndDateExclusive,
        ),
        alertsRepository.listOverdueDeliverables(supabase, userId, today),
        alertsRepository.listUpcomingContent(supabase, userId, today, contentEndDateExclusive),
        alertsRepository.listOverdueInvoices(supabase, userId, today),
      ]);

      const alerts = [
        ...collaborations.map((item) => ({
          id: `collaboration:${item.id}`,
          type: 'collaboration_deadline',
          severity: 'medium',
          title: 'Collaboration deadline approaching',
          message: `${item.campaign_name} with ${item.brand_name} is due within 3 days.`,
          relatedRecordId: item.id,
          date: item.deadline,
        })),
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

      const uniqueAlerts = new Map(alerts.map((alert) => [alert.id, alert]));
      return [...uniqueAlerts.values()].sort(compareAlerts).slice(0, MAX_ALERTS);
    },
  };
}

export const alertsService = createAlertsService();

import { describe, expect, it } from 'vitest';
import * as repository from '../modules/alerts/alerts.repository.js';

function createSupabase(rowsByTable, errorsByTable = {}) {
  const queries = [];

  return {
    queries,
    from(table) {
      const query = { table, filters: [], orders: [], limit: null };
      queries.push(query);
      const builder = {
        select(columns) {
          query.columns = columns;
          query.selectedColumns = columns.split(',').map((column) => column.trim());
          return builder;
        },
        eq(column, value) {
          query.filters.push(['eq', column, value]);
          return builder;
        },
        in(column, values) {
          query.filters.push(['in', column, values]);
          return builder;
        },
        is(column, value) {
          query.filters.push(['is', column, value]);
          return builder;
        },
        not(column, operator, value) {
          query.filters.push(['not', column, operator, value]);
          return builder;
        },
        lt(column, value) {
          query.filters.push(['lt', column, value]);
          return builder;
        },
        gte(column, value) {
          query.filters.push(['gte', column, value]);
          return builder;
        },
        order(column, options) {
          query.orders.push([column, options]);
          return builder;
        },
        limit(value) {
          query.limit = value;
          return builder;
        },
        then(resolve, reject) {
          const error = errorsByTable[table] || null;
          const rows = rowsByTable[table] || [];
          let data = rows.filter((row) =>
            query.filters.every(([operator, column, value, maybeValue]) => {
              if (operator === 'eq') return row[column] === value;
              if (operator === 'in') return value.includes(row[column]);
              if (operator === 'is') return row[column] === value;
              if (operator === 'not') return row[column] !== maybeValue;
              if (operator === 'lt') return row[column] < value;
              if (operator === 'gte') return row[column] >= value;
              return true;
            }),
          );
          for (const [column, options] of [...query.orders].reverse()) {
            data = [...data].sort((left, right) => {
              const comparison = left[column] < right[column] ? -1 : left[column] > right[column] ? 1 : 0;
              return options.ascending ? comparison : -comparison;
            });
          }
          if (query.limit !== null) data = data.slice(0, query.limit);
          data = data.map((row) =>
            Object.fromEntries(query.selectedColumns.map((column) => [column, row[column]])),
          );
          return Promise.resolve({ data: error ? null : data, error }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

describe('alerts repository', () => {
  it('queries only the authenticated user for active collaboration deadlines in range', async () => {
    const supabase = createSupabase({
      collaborations: [
        {
          id: 'soon',
          brand_name: 'Brand A',
          campaign_name: 'Launch',
          deadline: '2026-11-05',
          user_id: 'user-a',
          status: 'active',
        },
        {
          id: 'too-late',
          brand_name: 'Brand A',
          campaign_name: 'Later',
          deadline: '2026-11-06',
          user_id: 'user-a',
          status: 'active',
        },
        {
          id: 'draft',
          brand_name: 'Brand A',
          campaign_name: 'Draft',
          deadline: '2026-11-04',
          user_id: 'user-a',
          status: 'draft',
        },
        {
          id: 'other-user',
          brand_name: 'Private',
          campaign_name: 'Private',
          deadline: '2026-11-04',
          user_id: 'user-b',
          status: 'active',
        },
        {
          id: 'no-deadline',
          brand_name: 'Brand A',
          campaign_name: 'No date',
          deadline: null,
          user_id: 'user-a',
          status: 'active',
        },
      ],
    });

    await expect(
      repository.listUpcomingCollaborationDeadlines(supabase, 'user-a', '2026-11-02', '2026-11-06'),
    ).resolves.toEqual([
      {
        id: 'soon',
        brand_name: 'Brand A',
        campaign_name: 'Launch',
        deadline: '2026-11-05',
      },
    ]);
    expect(supabase.queries[0]).toMatchObject({
      table: 'collaborations',
      columns: 'id, brand_name, campaign_name, deadline',
      limit: 50,
    });
    expect(supabase.queries[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-a'],
        ['eq', 'status', 'active'],
        ['not', 'deadline', 'is', null],
        ['gte', 'deadline', '2026-11-02'],
        ['lt', 'deadline', '2026-11-06'],
      ]),
    );
  });

  it('queries only the authenticated user and qualifying deliverables', async () => {
    const supabase = createSupabase({
      deliverables: [
        { id: 'old', title: 'Old', due_date: '2026-11-01', user_id: 'user-a', status: 'pending' },
        { id: 'today', title: 'Today', due_date: '2026-11-02', user_id: 'user-a', status: 'pending' },
        { id: 'complete', title: 'Done', due_date: '2026-11-01', user_id: 'user-a', status: 'completed' },
        { id: 'cancelled', title: 'Cancelled', due_date: '2026-11-01', user_id: 'user-a', status: 'cancelled' },
        { id: 'other-user', title: 'Private', due_date: '2026-11-01', user_id: 'user-b', status: 'pending' },
        { id: 'no-date', title: 'No date', due_date: null, user_id: 'user-a', status: 'pending' },
      ],
    });

    await expect(repository.listOverdueDeliverables(supabase, 'user-a', '2026-11-02')).resolves.toEqual([
      { id: 'old', title: 'Old', due_date: '2026-11-01' },
    ]);
    expect(supabase.queries[0]).toMatchObject({
      table: 'deliverables',
      columns: 'id, title, due_date',
      limit: 50,
    });
    expect(supabase.queries[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-a'],
        ['in', 'status', ['pending', 'in_progress']],
        ['not', 'due_date', 'is', null],
        ['lt', 'due_date', '2026-11-02'],
      ]),
    );
  });

  it('includes scheduled content at today and excludes the exclusive seven-day end', async () => {
    const supabase = createSupabase({
      content_items: [
        { id: 'today', title: 'Today', scheduled_date: '2026-11-02', user_id: 'user-a', status: 'scheduled' },
        { id: 'last-day', title: 'Last day', scheduled_date: '2026-11-08', user_id: 'user-a', status: 'scheduled' },
        { id: 'end', title: 'End', scheduled_date: '2026-11-09', user_id: 'user-a', status: 'scheduled' },
        { id: 'idea', title: 'Idea', scheduled_date: '2026-11-03', user_id: 'user-a', status: 'idea' },
        { id: 'other-user', title: 'Private', scheduled_date: '2026-11-03', user_id: 'user-b', status: 'scheduled' },
      ],
    });

    await expect(
      repository.listUpcomingContent(supabase, 'user-a', '2026-11-02', '2026-11-09'),
    ).resolves.toEqual([
      { id: 'today', title: 'Today', scheduled_date: '2026-11-02' },
      { id: 'last-day', title: 'Last day', scheduled_date: '2026-11-08' },
    ]);
    expect(supabase.queries[0]).toMatchObject({
      table: 'content_items',
      columns: 'id, title, scheduled_date',
      limit: 50,
    });
    expect(supabase.queries[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-a'],
        ['eq', 'status', 'scheduled'],
        ['not', 'scheduled_date', 'is', null],
        ['gte', 'scheduled_date', '2026-11-02'],
        ['lt', 'scheduled_date', '2026-11-09'],
      ]),
    );
  });

  it('excludes paid, draft, cancelled, due-today, and other-user invoices', async () => {
    const supabase = createSupabase({
      invoices: [
        { id: 'sent-old', invoice_number: 'A', due_date: '2026-11-01', user_id: 'user-a', status: 'sent', paid_at: null },
        { id: 'overdue-old', invoice_number: 'B', due_date: '2026-10-31', user_id: 'user-a', status: 'overdue', paid_at: null },
        { id: 'paid', invoice_number: 'C', due_date: '2026-11-01', user_id: 'user-a', status: 'sent', paid_at: '2026-11-01T10:00:00Z' },
        { id: 'draft', invoice_number: 'D', due_date: '2026-11-01', user_id: 'user-a', status: 'draft', paid_at: null },
        { id: 'cancelled', invoice_number: 'E', due_date: '2026-11-01', user_id: 'user-a', status: 'cancelled', paid_at: null },
        { id: 'due-today', invoice_number: 'F', due_date: '2026-11-02', user_id: 'user-a', status: 'sent', paid_at: null },
        { id: 'other-user', invoice_number: 'G', due_date: '2026-11-01', user_id: 'user-b', status: 'sent', paid_at: null },
        { id: 'no-date', invoice_number: 'H', due_date: null, user_id: 'user-a', status: 'sent', paid_at: null },
      ],
    });

    await expect(repository.listOverdueInvoices(supabase, 'user-a', '2026-11-02')).resolves.toEqual([
      { id: 'overdue-old', invoice_number: 'B', due_date: '2026-10-31' },
      { id: 'sent-old', invoice_number: 'A', due_date: '2026-11-01' },
    ]);
    expect(supabase.queries[0]).toMatchObject({
      table: 'invoices',
      columns: 'id, invoice_number, due_date',
      limit: 50,
    });
    expect(supabase.queries[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-a'],
        ['in', 'status', ['sent', 'overdue']],
        ['is', 'paid_at', null],
        ['not', 'due_date', 'is', null],
        ['lt', 'due_date', '2026-11-02'],
      ]),
    );
  });

  it('maps query failures to the existing generic database error', async () => {
    const supabase = createSupabase({}, {
      invoices: { code: 'XX000', message: 'database unavailable' },
    });

    await expect(repository.listOverdueInvoices(supabase, 'user-a', '2026-11-02')).rejects.toMatchObject({
      status: 502,
      code: 'DATABASE_ERROR',
      message: 'Database request failed',
    });
  });
});

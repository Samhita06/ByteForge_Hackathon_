import { describe, expect, it } from 'vitest';
import { getBusinessInsights, getDashboardSummary } from '../modules/analytics/analytics.service.js';

const userId = 'user-a';
const today = '2026-11-01';

function createSupabase(rowsByTable = {}, errorsByTable = {}) {
  const queries = [];

  return {
    queries,
    from(table) {
      const query = { table, filters: [], orders: [] };
      queries.push(query);
      const builder = {
        select(columns, options = {}) {
          query.columns = columns;
          query.countOption = options.count;
          query.head = options.head;
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
        gt(column, value) {
          query.filters.push(['gt', column, value]);
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
        range(from, to) {
          query.range = [from, to];
          return builder;
        },
        async maybeSingle() {
          const result = execute(query, rowsByTable, errorsByTable);
          return { data: result.data?.[0] || null, error: result.error };
        },
        then(resolve, reject) {
          return Promise.resolve(execute(query, rowsByTable, errorsByTable)).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

function execute(query, rowsByTable, errorsByTable) {
  const error = errorsByTable[query.table];
  if (error) return { data: null, count: null, error };

  let rows = [...(rowsByTable[query.table] || [])].filter((row) =>
    query.filters.every(([operator, column, value, maybeValue]) => {
      if (operator === 'eq') return row[column] === value;
      if (operator === 'in') return value.includes(row[column]);
      if (operator === 'is') return row[column] === value;
      if (operator === 'not') return row[column] !== maybeValue;
      if (operator === 'lt') return row[column] != null && row[column] < value;
      if (operator === 'gt') return row[column] != null && row[column] > value;
      return true;
    }),
  );
  const count = query.countOption === 'exact' ? rows.length : null;

  for (const [column, options] of [...query.orders].reverse()) {
    rows.sort((left, right) => {
      const comparison = left[column] < right[column] ? -1 : left[column] > right[column] ? 1 : 0;
      return options.ascending ? comparison : -comparison;
    });
  }
  if (query.range) rows = rows.slice(query.range[0], query.range[1] + 1);
  if (query.limit !== undefined) rows = rows.slice(0, query.limit);
  if (query.head) return { data: null, count, error: null };
  if (query.columns !== '*') {
    const columns = query.columns.split(',').map((column) => column.trim());
    rows = rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]])));
  }
  return { data: rows, count, error: null };
}

function queryFor(supabase, table) {
  return supabase.queries.find((query) => query.table === table);
}

describe('creator business insights', () => {
  it('uses exact user-scoped counts and the UTC date boundary', async () => {
    const supabase = createSupabase({
      collaborations: [
        { id: 'active', user_id: userId, status: 'active' },
        { id: 'draft', user_id: userId, status: 'draft' },
        { id: 'other', user_id: 'user-b', status: 'active' },
      ],
      content_items: [
        { id: 'scheduled', user_id: userId, status: 'scheduled' },
        { id: 'idea', user_id: userId, status: 'idea' },
      ],
      deliverables: [
        { id: 'yesterday', user_id: userId, status: 'pending', due_date: '2026-10-31' },
        { id: 'today', user_id: userId, status: 'in_progress', due_date: today },
        { id: 'null-date', user_id: userId, status: 'pending', due_date: null },
        { id: 'completed', user_id: userId, status: 'completed', due_date: '2026-10-31' },
        { id: 'other-user', user_id: 'user-b', status: 'pending', due_date: '2026-10-31' },
      ],
    });

    await expect(
      getBusinessInsights(supabase, userId, { clock: () => new Date('2026-11-02T00:15:00+05:30') }),
    ).resolves.toEqual({
      activeCollaborations: 1,
      scheduledContent: 1,
      overdueDeliverables: 1,
      outstandingInvoices: {
        count: 0,
        amountBasis: 'invoice_face_value',
        amountsByCurrency: [],
      },
    });

    expect(queryFor(supabase, 'collaborations')).toMatchObject({
      countOption: 'exact',
      head: true,
      filters: [
        ['eq', 'user_id', userId],
        ['eq', 'status', 'active'],
      ],
    });
    expect(queryFor(supabase, 'content_items').filters).toEqual([
      ['eq', 'user_id', userId],
      ['eq', 'status', 'scheduled'],
    ]);
    expect(queryFor(supabase, 'deliverables').filters).toEqual([
      ['eq', 'user_id', userId],
      ['in', 'status', ['pending', 'in_progress']],
      ['not', 'due_date', 'is', null],
      ['lt', 'due_date', today],
    ]);
  });

  it('counts records beyond the dashboard list page size', async () => {
    const supabase = createSupabase({
      collaborations: Array.from({ length: 73 }, (_, index) => ({
        id: `c-${index}`,
        user_id: userId,
        status: 'active',
      })),
      content_items: Array.from({ length: 61 }, (_, index) => ({
        id: `p-${index}`,
        user_id: userId,
        status: 'scheduled',
      })),
      deliverables: Array.from({ length: 58 }, (_, index) => ({
        id: `d-${index}`,
        user_id: userId,
        status: 'in_progress',
        due_date: '2026-10-31',
      })),
    });

    await expect(
      getBusinessInsights(supabase, userId, { clock: () => new Date(`${today}T12:00:00Z`) }),
    ).resolves.toMatchObject({
      activeCollaborations: 73,
      scheduledContent: 61,
      overdueDeliverables: 58,
    });
  });

  it('paginates all unpaid outstanding invoices and groups exact decimal totals by currency', async () => {
    const invoices = Array.from({ length: 501 }, (_, index) => ({
      id: `invoice-${String(index).padStart(3, '0')}`,
      user_id: userId,
      status: index === 500 ? 'overdue' : 'sent',
      paid_at: null,
      amount: index === 0 ? '0.10' : index === 1 ? '0.20' : '10.00',
      currency: index === 500 ? 'usd' : 'INR',
    }));
    invoices.push(
      { id: 'draft', user_id: userId, status: 'draft', paid_at: null, amount: '99.00', currency: 'INR' },
      { id: 'paid', user_id: userId, status: 'sent', paid_at: '2026-11-01T00:00:00Z', amount: '99.00', currency: 'INR' },
      { id: 'cancelled', user_id: userId, status: 'cancelled', paid_at: null, amount: '99.00', currency: 'INR' },
      { id: 'other-user', user_id: 'user-b', status: 'sent', paid_at: null, amount: '99.00', currency: 'INR' },
    );
    const supabase = createSupabase({ invoices });

    const result = await getBusinessInsights(supabase, userId, {
      clock: () => new Date(`${today}T12:00:00Z`),
    });

    expect(result.outstandingInvoices).toEqual({
      count: 501,
      amountBasis: 'invoice_face_value',
      amountsByCurrency: [
        { currency: 'INR', amount: '4980.30', count: 500 },
        { currency: 'USD', amount: '10.00', count: 1 },
      ],
    });
    const invoiceQueries = supabase.queries.filter((query) => query.table === 'invoices');
    const expectedAfterId = invoices
      .filter((invoice) => invoice.user_id === userId)
      .sort((left, right) => left.id.localeCompare(right.id))[499].id;
    expect(invoiceQueries).toHaveLength(2);
    expect(invoiceQueries[0]).toMatchObject({
      columns: 'id, invoice_number, amount, currency, status, paid_at, created_at, updated_at',
      limit: 500,
      orders: [['id', { ascending: true }]],
      filters: [['eq', 'user_id', userId]],
    });
    for (const query of invoiceQueries) {
      expect(query.filters).toContainEqual(['eq', 'user_id', userId]);
    }
    expect(invoiceQueries[1].filters).toContainEqual(['gt', 'id', expectedAfterId]);
  });

  it('returns empty metrics when the authenticated user has no matching records', async () => {
    await expect(
      getBusinessInsights(createSupabase(), userId, { clock: () => new Date(`${today}T12:00:00Z`) }),
    ).resolves.toEqual({
      activeCollaborations: 0,
      scheduledContent: 0,
      overdueDeliverables: 0,
      outstandingInvoices: {
        count: 0,
        amountBasis: 'invoice_face_value',
        amountsByCurrency: [],
      },
    });
  });

  it.each(['content_items', 'invoices'])(
    'fails with the generic database error when the %s query fails',
    async (table) => {
      const supabase = createSupabase({}, {
        [table]: { code: 'XX000', message: 'query failed' },
      });

      await expect(
        getBusinessInsights(supabase, userId, { clock: () => new Date(`${today}T12:00:00Z`) }),
      ).rejects.toMatchObject({
        status: 502,
        code: 'DATABASE_ERROR',
        message: 'Database request failed',
      });
    },
  );

  it.each([
    ['currency', { amount: '1.00', currency: 'US$' }],
    ['amount', { amount: '1.001', currency: 'USD' }],
  ])('rejects malformed invoice %s values rather than returning misleading totals', async (_label, values) => {
    const supabase = createSupabase({
      invoices: [{ id: 'invalid', user_id: userId, status: 'sent', paid_at: null, ...values }],
    });

    await expect(
      getBusinessInsights(supabase, userId, { clock: () => new Date(`${today}T12:00:00Z`) }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'DATABASE_ERROR',
      message: 'Database request failed',
    });
  });

  it('adds insights without changing existing dashboard fields or list-based count meanings', async () => {
    const supabase = createSupabase({
      profiles: [{ id: userId, display_name: 'Creator', niche: 'Art', reporting_currency: 'INR' }],
      collaborations: [
        { id: 'active', user_id: userId, brand_name: 'Brand', campaign_name: 'Campaign', status: 'active', created_at: today },
        { id: 'draft', user_id: userId, brand_name: 'Brand', campaign_name: 'Draft', status: 'draft', created_at: today },
      ],
      deliverables: [],
      content_items: [
        { id: 'scheduled', user_id: userId, title: 'Scheduled', status: 'scheduled', scheduled_date: today, updated_at: today },
        { id: 'idea', user_id: userId, title: 'Idea', status: 'idea', scheduled_date: null, updated_at: today },
      ],
      invoices: [],
      transactions: [],
    });

    const result = await getDashboardSummary(
      supabase,
      { id: userId, email: 'creator@example.test' },
      { clock: () => new Date(`${today}T12:00:00Z`) },
    );

    expect(result).toMatchObject({
      profile: { display_name: 'Creator', niche: 'Art', reporting_currency: 'INR' },
      counts: { activeCollaborations: 2, upcomingDeliverables: 0, scheduledContent: 2 },
      financials: {
        reportingCurrency: 'INR',
        receivedEarnings: 0,
        expenses: 0,
        netEarnings: 0,
        pendingInvoiceTotal: 0,
        excludedOtherCurrencyCount: 0,
      },
      activeCollaborations: expect.any(Array),
      upcomingDeliverables: [],
      scheduledContent: expect.any(Array),
      recentActivity: expect.any(Array),
      upcomingDeadlines: expect.any(Array),
      businessInsights: {
        activeCollaborations: 1,
        scheduledContent: 1,
        overdueDeliverables: 0,
        outstandingInvoices: {
          count: 0,
          amountBasis: 'invoice_face_value',
          amountsByCurrency: [],
        },
      },
    });
  });
});

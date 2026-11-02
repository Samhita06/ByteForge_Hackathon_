import { throwIfDbError } from '../../shared/utils/db.js';

const CATEGORY_QUERY_LIMIT = 50;

export async function listUpcomingCollaborationDeadlines(supabase, userId, today, endDateExclusive) {
  const { data, error } = await supabase
    .from('collaborations')
    .select('id, brand_name, campaign_name, deadline')
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('deadline', 'is', null)
    .gte('deadline', today)
    .lt('deadline', endDateExclusive)
    .order('deadline', { ascending: true })
    .order('id', { ascending: true })
    .limit(CATEGORY_QUERY_LIMIT);
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_upcoming_collaboration_deadlines',
    table: 'collaborations',
  });
  return data || [];
}

export async function listOverdueDeliverables(supabase, userId, today) {
  const { data, error } = await supabase
    .from('deliverables')
    .select('id, title, due_date')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .order('id', { ascending: true })
    .limit(CATEGORY_QUERY_LIMIT);
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_overdue_deliverables',
    table: 'deliverables',
  });
  return data || [];
}

export async function listUpcomingContent(supabase, userId, today, endDateExclusive) {
  const { data, error } = await supabase
    .from('content_items')
    .select('id, title, scheduled_date')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .not('scheduled_date', 'is', null)
    .gte('scheduled_date', today)
    .lt('scheduled_date', endDateExclusive)
    .order('scheduled_date', { ascending: true })
    .order('id', { ascending: true })
    .limit(CATEGORY_QUERY_LIMIT);
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_upcoming_content',
    table: 'content_items',
  });
  return data || [];
}

export async function listOverdueInvoices(supabase, userId, today) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date')
    .eq('user_id', userId)
    .in('status', ['sent', 'overdue'])
    .is('paid_at', null)
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .order('id', { ascending: true })
    .limit(CATEGORY_QUERY_LIMIT);
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_overdue_invoices',
    table: 'invoices',
  });
  return data || [];
}

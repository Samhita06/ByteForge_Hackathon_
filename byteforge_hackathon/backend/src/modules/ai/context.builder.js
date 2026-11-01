import * as creatorRepo from '../creators/creators.repository.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as deliverableRepo from '../deliverables/deliverables.repository.js';
import * as contentRepo from '../content/content.repository.js';
import * as financeRepo from '../finance/finance.repository.js';

function clip(text, max = 240) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function buildCreatorContext(supabase, user) {
  const profile = await creatorRepo.findProfile(supabase, user.id);
  const [collaborations, deliverables, content, invoices, transactions] = await Promise.all([
    collabRepo.listCollaborations(supabase, user.id, { page: 1, pageSize: 12 }),
    deliverableRepo.listDeliverables(supabase, user.id, { page: 1, pageSize: 12 }),
    contentRepo.listContent(supabase, user.id, { page: 1, pageSize: 12 }),
    financeRepo.listAllInvoices(supabase, user.id),
    financeRepo.listAllTransactions(supabase, user.id),
  ]);

  const pendingInvoices = invoices.filter((row) => ['draft', 'sent', 'overdue'].includes(row.status)).slice(0, 8);
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 8);

  return {
    profile: {
      display_name: profile?.display_name || user.email?.split('@')[0] || 'Creator',
      niche: profile?.niche || null,
      primary_platform: profile?.primary_platform || null,
      reporting_currency: profile?.reporting_currency || 'INR',
    },
    activeCollaborations: collaborations.data
      .filter((row) => ['draft', 'active'].includes(row.status))
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        brand_name: row.brand_name,
        campaign_name: row.campaign_name,
        status: row.status,
        deadline: row.deadline,
        agreed_amount: row.agreed_amount,
        currency: row.currency,
      })),
    upcomingDeadlines: deliverables.data
      .filter((row) => ['pending', 'in_progress'].includes(row.status))
      .slice(0, 8)
      .map((row) => ({
        id: row.id,
        title: row.title,
        due_date: row.due_date,
        status: row.status,
        collaboration_id: row.collaboration_id,
      })),
    plannedContent: content.data.slice(0, 8).map((row) => ({
      id: row.id,
      title: row.title,
      platform: row.platform,
      content_type: row.content_type,
      scheduled_date: row.scheduled_date,
      status: row.status,
    })),
    pendingInvoices: pendingInvoices.map((row) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      due_date: row.due_date,
      collaboration_id: row.collaboration_id,
    })),
    recentActivity: recentTransactions.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      category: clip(row.category, 40),
      transaction_date: row.transaction_date,
    })),
  };
}

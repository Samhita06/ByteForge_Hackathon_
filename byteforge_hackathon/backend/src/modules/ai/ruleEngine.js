const today = () => new Date().toISOString().slice(0, 10);

function daysUntil(date) {
  if (!date) return null;
  return Math.round((new Date(date) - new Date(today())) / 86400000);
}

export function buildRuleBasedRecommendations(context) {
  const items = [];

  for (const deal of context.activeCollaborations) {
    const remaining = daysUntil(deal.deadline);
    if (remaining !== null && remaining <= 7) {
      items.push({
        title: `Follow through on ${deal.brand_name}`,
        explanation: `${deal.campaign_name} is ${remaining < 0 ? 'past due' : `due in ${remaining} day(s)`}. This is based on the saved collaboration deadline.`,
        priority: remaining < 0 ? 'high' : 'medium',
        sourceRecord: { type: 'collaboration', id: deal.id },
        suggestedNextAction: 'Open the collaboration and update deliverable status or request an extension.',
      });
    }
  }

  for (const item of context.upcomingDeadlines) {
    const remaining = daysUntil(item.due_date);
    if (item.status !== 'completed') {
      items.push({
        title: `Complete deliverable: ${item.title}`,
        explanation: item.due_date
          ? `This deliverable is saved as ${item.status} and due ${item.due_date}.`
          : `This deliverable is saved as ${item.status} with no due date.`,
        priority: remaining !== null && remaining <= 3 ? 'high' : 'medium',
        sourceRecord: { type: 'deliverable', id: item.id },
        suggestedNextAction: 'Mark progress or finish the asset before the due date.',
      });
    }
  }

  for (const invoice of context.pendingInvoices) {
    items.push({
      title: `Follow up on invoice ${invoice.invoice_number}`,
      explanation: `Invoice ${invoice.invoice_number} is ${invoice.status} for ${invoice.amount} ${invoice.currency}. No payment transaction is counted until the invoice is marked paid.`,
      priority: invoice.status === 'overdue' ? 'high' : 'medium',
      sourceRecord: { type: 'invoice', id: invoice.id },
      suggestedNextAction: 'Send a payment reminder or mark the invoice paid after funds arrive.',
    });
  }

  if (context.plannedContent.length === 0) {
    items.push({
      title: 'Plan this week’s content',
      explanation: context.profile.niche
        ? `No planned content items were found. Your profile niche is ${context.profile.niche}.`
        : 'No planned content items were found in your calendar.',
      priority: 'medium',
      sourceRecord: null,
      suggestedNextAction: 'Add at least one scheduled post in the content planner.',
    });
  } else if (context.profile.primary_platform) {
    const onPrimary = context.plannedContent.filter((row) => row.platform === context.profile.primary_platform);
    if (onPrimary.length === 0) {
      items.push({
        title: `Schedule something for ${context.profile.primary_platform}`,
        explanation: `Your profile lists ${context.profile.primary_platform} as the primary platform, but no planned items use it.`,
        priority: 'low',
        sourceRecord: null,
        suggestedNextAction: `Create a ${context.profile.primary_platform} content item.`,
      });
    }
  }

  if (context.activeCollaborations.length === 0) {
    items.push({
      title: 'Add your next brand collaboration',
      explanation: 'No active collaborations are saved yet, so earnings and deliverables cannot be tracked.',
      priority: 'low',
      sourceRecord: null,
      suggestedNextAction: 'Create a collaboration with brand, campaign, amount, and deadline.',
    });
  }

  if (items.length === 0) {
    items.push({
      title: 'Your workspace is in good shape',
      explanation: 'No urgent deadlines, pending invoices, or empty calendars were found in the saved records.',
      priority: 'low',
      sourceRecord: null,
      suggestedNextAction: 'Review the dashboard and keep logging new work as it comes in.',
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]).slice(0, 6);
}

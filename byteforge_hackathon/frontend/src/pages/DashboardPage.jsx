import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Handshake,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/apiClient.js';
import { Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

const chartColors = {
  success: 'var(--success)',
  pending: 'var(--accent-blue)',
  expenses: 'var(--danger)',
  net: 'var(--accent-secondary)',
};

function compactMoney(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(value, currency);
  }
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard/summary'),
  });

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />;

  const data = query.data.data;
  const financials = data.financials;
  const currency = financials.reportingCurrency;
  const collaborations = data.activeCollaborations;
  const deadlines = data.upcomingDeadlines;
  const deliverables = data.upcomingDeliverables;
  const scheduledContent = data.scheduledContent;
  const recentActivity = data.recentActivity;
  const chartData = [
    { name: 'Received', value: financials.receivedEarnings, fill: chartColors.success },
    { name: 'Pending', value: financials.pendingInvoiceTotal, fill: chartColors.pending },
    { name: 'Expenses', value: financials.expenses, fill: chartColors.expenses },
    { name: 'Net earnings', value: financials.netEarnings, fill: chartColors.net },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Your creator workspace</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Welcome back, {data.profile.display_name || 'Creator'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {data.profile.niche
              ? `Here’s what’s happening with your ${data.profile.niche} work.`
              : 'Here’s what’s happening across your creator business.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => query.refetch()}
            disabled={query.isRefetching}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw size={15} className={query.isRefetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <QuickAction to="/collaborations" icon={Plus}>
            New collaboration
          </QuickAction>
        </div>
      </section>

      <section aria-label="Business overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Active collaborations"
          value={data.counts.activeCollaborations}
          detail="Campaigns in progress"
          icon={Handshake}
          tone="accent-primary"
        />
        <MetricCard
          label="Received earnings"
          value={formatMoney(financials.receivedEarnings, currency)}
          detail={`Recorded in ${currency}`}
          icon={CircleDollarSign}
          tone="success"
        />
        <MetricCard
          label="Pending invoices"
          value={formatMoney(financials.pendingInvoiceTotal, currency)}
          detail="Awaiting payment"
          icon={Clock3}
          tone="accent-blue"
        />
        <MetricCard
          label="Expenses"
          value={formatMoney(financials.expenses, currency)}
          detail="Recorded expenses"
          icon={Wallet}
          tone="danger"
        />
        <MetricCard
          label="Net earnings"
          value={formatMoney(financials.netEarnings, currency)}
          detail="Received less expenses"
          icon={TrendingUp}
          tone="accent-secondary"
        />
      </section>

      {financials.excludedOtherCurrencyCount > 0 ? (
        <div
          role="status"
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--warning) 10%, var(--surface-card))',
            color: 'var(--warning)',
          }}
        >
          <span className="font-semibold">{financials.excludedOtherCurrencyCount} record(s)</span> in other currencies
          are excluded from {currency} totals. Currency conversion is not applied.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Financial snapshot</p>
              <p className="mt-1 text-xs text-slate-500">Your recorded totals · {currency}</p>
            </div>
            <Link
              to="/finance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              Open finance <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickFormatter={(value) => compactMoney(value, currency)}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-raised)', opacity: 0.5 }}
                  formatter={(value) => [formatMoney(value, currency), 'Amount']}
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
                />
                <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={54}>
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                {item.name}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Upcoming deadlines</p>
              <p className="mt-1 text-xs text-slate-500">Keep your next commitments in view</p>
            </div>
            <span className="rounded-xl bg-accent/10 p-2 text-accent">
              <CalendarClock size={17} />
            </span>
          </div>
          {deadlines.length === 0 ? (
            <EmptyMessage
              icon={CalendarDays}
              title="Nothing due soon"
              description="Deadlines from campaigns, deliverables, and scheduled content will appear here."
            />
          ) : (
            <ul className="space-y-1">
              {deadlines.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <DeadlineItem item={item} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <SectionHeading
            title="Active collaborations"
            description="Campaigns you’re currently working on"
            to="/collaborations"
          />
          {collaborations.length === 0 ? (
            <EmptyState
              title="Your next partnership starts here"
              description="Create a collaboration to organize campaign details, deliverables, and deadlines."
              action={
                <QuickAction to="/collaborations" icon={Plus}>
                  Create collaboration
                </QuickAction>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {collaborations.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Handshake size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{item.brand_name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.campaign_name}</p>
                    </div>
                  </div>
                  {item.deadline ? (
                    <p className="shrink-0 text-right text-xs text-slate-500">
                      <span className="block text-[10px] uppercase tracking-wide">Due</span>
                      {formatDate(item.deadline)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeading
            title="Upcoming deliverables"
            description={`${data.counts.upcomingDeliverables} open item(s)`}
            to="/collaborations"
          />
          {deliverables.length === 0 ? (
            <EmptyMessage
              icon={FileText}
              title="No open deliverables"
              description="When a campaign has work in progress, its deliverables will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {deliverables.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel/70 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    {item.due_date ? (
                      <p className="mt-1 text-xs text-slate-500">Due {formatDate(item.due_date)}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">{item.status.replaceAll('_', ' ')}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-semibold capitalize text-accent">
                    {item.status.replaceAll('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <SectionHeading title="Scheduled content" description="Planned posts and content" to="/planner" />
          {scheduledContent.length === 0 ? (
            <EmptyMessage
              icon={CalendarDays}
              title="No content scheduled"
              description="Plan a post to keep your publishing calendar moving."
              action={<QuickAction to="/planner" icon={Plus}>Plan content</QuickAction>}
            />
          ) : (
            <ul className="space-y-1">
              {scheduledContent.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {item.platform} · {item.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  {item.scheduled_date ? (
                    <p className="shrink-0 text-xs text-slate-500">{formatDate(item.scheduled_date)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeading title="Recent activity" description="Latest updates across your workspace" />
          {recentActivity.length === 0 ? (
            <EmptyMessage
              icon={Activity}
              title="Your activity will appear here"
              description="Create a collaboration, plan content, or send an invoice to get started."
            />
          ) : (
            <ul className="space-y-1">
              {recentActivity.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                  <span className="mt-0.5 rounded-lg bg-panel p-2 text-slate-500">
                    {item.kind === 'collaboration' ? (
                      <Handshake size={15} />
                    ) : item.kind === 'invoice' ? (
                      <CircleDollarSign size={15} />
                    ) : (
                      <FileText size={15} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-ink">{item.title}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{item.kind}</p>
                  </div>
                  <p className="shrink-0 text-right text-xs text-slate-500">{formatDate(item.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <Card className="p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-3 truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
        </div>
        <span
          className="rounded-xl p-2.5"
          style={{
            color: `var(--${tone})`,
            backgroundColor: `color-mix(in srgb, var(--${tone}) 12%, transparent)`,
          }}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{detail}</p>
    </Card>
  );
}

function SectionHeading({ title, description, to }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {to ? (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline">
          View all <ArrowRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}

function DeadlineItem({ item }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-panel">
      <span className="rounded-lg bg-accent/10 p-2 text-accent">
        {item.kind === 'collaboration' ? <Handshake size={15} /> : <CalendarDays size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.title}</p>
        <p className="mt-0.5 text-xs capitalize text-slate-500">{item.kind}</p>
      </div>
      <p className="shrink-0 text-right text-xs font-medium text-slate-500">{formatDate(item.date)}</p>
    </div>
  );
}

function EmptyMessage({ icon: Icon, title, description, action }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/50 px-5 py-7 text-center">
      <span className="mb-3 rounded-xl bg-card p-2.5 text-slate-500 shadow-sm">
        <Icon size={18} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function QuickAction({ to, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:brightness-110 focus-visible:outline-offset-2"
    >
      <Icon size={15} />
      {children}
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
        <Skeleton className="h-[25rem]" />
        <Skeleton className="h-[25rem]" />
      </div>
    </div>
  );
}

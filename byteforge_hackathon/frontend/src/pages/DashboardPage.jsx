import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/apiClient.js';
import { Card } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { PageSkeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard/summary'),
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />;

  const data = query.data.data;
  const currency = data.financials.reportingCurrency;
  const chartData = [
    { name: 'Received', value: data.financials.receivedEarnings },
    { name: 'Pending', value: data.financials.pendingInvoiceTotal },
    { name: 'Expenses', value: data.financials.expenses },
    { name: 'Net', value: data.financials.netEarnings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Welcome back</p>
          <h1 className="text-3xl font-extrabold text-ink">{data.profile.display_name}</h1>
        </div>
        <Button variant="secondary" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active collaborations" value={data.counts.activeCollaborations} />
        <Stat label="Received earnings" value={formatMoney(data.financials.receivedEarnings, currency)} />
        <Stat label="Pending invoices" value={formatMoney(data.financials.pendingInvoiceTotal, currency)} />
        <Stat label="Net earnings" value={formatMoney(data.financials.netEarnings, currency)} />
      </div>
      {data.financials.excludedOtherCurrencyCount > 0 ? (
        <p className="text-sm text-amber-800">
          {data.financials.excludedOtherCurrencyCount} record(s) in other currencies are excluded from {currency}{' '}
          totals. ByteForge does not convert currencies in the MVP.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold text-ink">Financial snapshot</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#6d4aff" fill="#cfc0ff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Upcoming deadlines</h2>
          {data.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-slate-500">No dated work yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.upcomingDeadlines.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex justify-between gap-3 text-sm">
                  <span>{item.title}</span>
                  <span className="text-slate-500">{formatDate(item.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Active collaborations</h2>
            <Link className="text-sm font-semibold text-accent" to="/collaborations">
              View all
            </Link>
          </div>
          {data.activeCollaborations.length === 0 ? (
            <EmptyState title="No brand deals yet" description="Create a collaboration to start tracking campaigns." />
          ) : (
            <ul className="space-y-3">
              {data.activeCollaborations.map((row) => (
                <li key={row.id} className="rounded-xl bg-panel px-3 py-3 text-sm">
                  <p className="font-semibold">{row.brand_name}</p>
                  <p className="text-slate-600">{row.campaign_name}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold text-ink">Upcoming deliverables</h2>
          {data.upcomingDeliverables.length === 0 ? (
            <p className="text-sm text-slate-500">No open deliverables.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.upcomingDeliverables.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{row.title}</span>
                  <span className="text-slate-500">{formatDate(row.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
    </Card>
  );
}

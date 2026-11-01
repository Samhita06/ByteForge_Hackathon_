import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Plus,
  ReceiptText,
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
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select } from '../components/ui/input.jsx';
import { Skeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { formatDate, formatMoney, labelize } from '../utils/format.js';

const emptyTransaction = {
  type: 'income',
  amount: '',
  currency: 'INR',
  category: '',
  transaction_date: '',
  description: '',
  collaboration_id: '',
};

const emptyInvoice = {
  collaboration_id: '',
  invoice_number: '',
  amount: '',
  currency: 'INR',
  issue_date: '',
  due_date: '',
  status: 'sent',
};

export function FinancePage() {
  const toast = useToast();
  const client = useQueryClient();
  const [txType, setTxType] = useState('');
  const [txForm, setTxForm] = useState(emptyTransaction);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);

  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/api/dashboard/summary') });
  const transactions = useQuery({
    queryKey: ['transactions', txType],
    queryFn: () => api.get(`/api/transactions${txType ? `?type=${txType}` : ''}`),
  });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/api/invoices') });
  const collaborations = useQuery({
    queryKey: ['collaborations'],
    queryFn: () => api.get('/api/collaborations?pageSize=50'),
  });

  const createTx = useMutation({
    mutationFn: (body) => api.post('/api/transactions', body),
    onSuccess: () => {
      toast.push('Transaction saved', 'success');
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const createInvoice = useMutation({
    mutationFn: (body) => api.post('/api/invoices', body),
    onSuccess: () => {
      toast.push('Invoice created', 'success');
      client.invalidateQueries({ queryKey: ['invoices'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });
  const updateInvoice = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/invoices/${id}`, { status }),
    onSuccess: () => {
      toast.push('Invoice updated. Paid invoices create one income transaction.', 'success');
      client.invalidateQueries({ queryKey: ['invoices'] });
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.push(err.message, 'error'),
  });

  if (dashboard.isLoading || transactions.isLoading || invoices.isLoading) return <FinanceSkeleton />;
  const failedQuery = [dashboard, transactions, invoices].find((query) => query.isError);
  if (failedQuery) return <ErrorState message={failedQuery.error.message} onRetry={failedQuery.refetch} />;

  const financials = dashboard.data.data.financials;
  const collabs = collaborations.data?.data || [];
  const invoiceRows = invoices.data?.data || [];
  const transactionRows = transactions.data?.data || [];
  const currency = financials.reportingCurrency;
  const chartData = [
    { name: 'Received', value: financials.receivedEarnings, fill: 'var(--success)' },
    { name: 'Pending', value: financials.pendingInvoiceTotal, fill: 'var(--accent-blue)' },
    { name: 'Expenses', value: financials.expenses, fill: 'var(--danger)' },
    { name: 'Net', value: financials.netEarnings, fill: 'var(--accent-secondary)' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">Earnings, expenses, and invoices</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Finance</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Received earnings come from income transactions only. Marking an invoice paid records one linked income
            entry, so invoice totals are not counted twice.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-slate-500">
          Reporting currency <span className="ml-1 font-semibold text-ink">{currency}</span>
        </div>
      </section>

      <section aria-label="Financial overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Received earnings"
          value={formatMoney(financials.receivedEarnings, currency)}
          detail="Income transactions"
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
          icon={ArrowUpRight}
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
          {financials.excludedOtherCurrencyCount} record(s) in other currencies are excluded from {currency} totals.
          ByteForge does not convert currencies.
        </div>
      ) : null}

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">Earnings snapshot</h3>
              <p className="mt-1 text-xs text-slate-500">Recorded totals in {currency}; not a time-series forecast.</p>
            </div>
            <span className="rounded-xl bg-accent/10 p-2 text-accent">
              <ReceiptText size={17} />
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 6, left: 4, bottom: 0 }}>
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
                <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
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
          <FormHeading icon={ArrowDownRight} title="Record a transaction" description="Add an income or expense entry." />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createTx.mutate({
                ...txForm,
                amount: Number(txForm.amount),
                currency: txForm.currency.toUpperCase(),
                collaboration_id: txForm.collaboration_id || null,
                transaction_date: txForm.transaction_date || undefined,
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type" htmlFor="type">
                <Select id="type" value={txForm.type} onChange={(event) => setTxForm({ ...txForm, type: event.target.value })}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </Select>
              </Field>
              <Field label="Amount" htmlFor="amount">
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={txForm.amount}
                  onChange={(event) => setTxForm({ ...txForm, amount: event.target.value })}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Currency" htmlFor="tx-currency">
                <Input
                  id="tx-currency"
                  maxLength={3}
                  value={txForm.currency}
                  onChange={(event) => setTxForm({ ...txForm, currency: event.target.value })}
                />
              </Field>
              <Field label="Category" htmlFor="category">
                <Input
                  id="category"
                  value={txForm.category}
                  onChange={(event) => setTxForm({ ...txForm, category: event.target.value })}
                  placeholder="e.g. Sponsorship"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date" htmlFor="transaction_date">
                <Input
                  id="transaction_date"
                  type="date"
                  value={txForm.transaction_date}
                  onChange={(event) => setTxForm({ ...txForm, transaction_date: event.target.value })}
                />
              </Field>
              <Field label="Collaboration (optional)" htmlFor="tx-collab">
                <Select
                  id="tx-collab"
                  value={txForm.collaboration_id}
                  onChange={(event) => setTxForm({ ...txForm, collaboration_id: event.target.value })}
                  disabled={collaborations.isLoading || collaborations.isError}
                >
                  <option value="">None</option>
                  {collabs.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.brand_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Description" htmlFor="tx-desc">
              <Input
                id="tx-desc"
                value={txForm.description}
                onChange={(event) => setTxForm({ ...txForm, description: event.target.value })}
                placeholder="Optional note"
              />
            </Field>
            {collaborations.isError ? <QueryNote message="Collaboration options could not be loaded." /> : null}
            <Button type="submit" disabled={createTx.isPending}>
              <Plus size={15} /> {createTx.isPending ? 'Saving…' : 'Save transaction'}
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <Card className="p-4 sm:p-6">
          <FormHeading icon={FileText} title="Create invoice" description="Create an invoice for a collaboration." />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createInvoice.mutate({
                ...invoiceForm,
                amount: Number(invoiceForm.amount),
                currency: invoiceForm.currency.toUpperCase(),
                issue_date: invoiceForm.issue_date || undefined,
                due_date: invoiceForm.due_date || null,
              });
            }}
          >
            <Field label="Collaboration" htmlFor="inv-collab">
              <Select
                id="inv-collab"
                value={invoiceForm.collaboration_id}
                onChange={(event) => setInvoiceForm({ ...invoiceForm, collaboration_id: event.target.value })}
                required
                disabled={collaborations.isLoading || collaborations.isError || collabs.length === 0}
              >
                <option value="">Select a deal</option>
                {collabs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.brand_name} · {row.campaign_name}
                  </option>
                ))}
              </Select>
            </Field>
            {collaborations.isError ? (
              <QueryNote message="Collaboration options could not be loaded. Retry by refreshing this page." />
            ) : collabs.length === 0 && !collaborations.isLoading ? (
              <p className="text-xs text-slate-500">Create a collaboration before issuing a linked invoice.</p>
            ) : null}
            <Field label="Invoice number" htmlFor="invoice_number">
              <Input
                id="invoice_number"
                value={invoiceForm.invoice_number}
                onChange={(event) => setInvoiceForm({ ...invoiceForm, invoice_number: event.target.value })}
                placeholder="e.g. BF-INV-002"
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount" htmlFor="inv-amount">
                <Input
                  id="inv-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })}
                  required
                />
              </Field>
              <Field label="Currency" htmlFor="inv-currency">
                <Input
                  id="inv-currency"
                  maxLength={3}
                  value={invoiceForm.currency}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, currency: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Issue date" htmlFor="issue_date">
                <Input
                  id="issue_date"
                  type="date"
                  value={invoiceForm.issue_date}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, issue_date: event.target.value })}
                />
              </Field>
              <Field label="Due date" htmlFor="due_date">
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, due_date: event.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" disabled={createInvoice.isPending || collaborations.isLoading || collabs.length === 0}>
              <Plus size={15} /> {createInvoice.isPending ? 'Creating…' : 'Create invoice'}
            </Button>
          </form>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">Invoices</h3>
              <p className="mt-1 text-xs text-slate-500">Payment status and amounts due.</p>
            </div>
            <span className="rounded-xl bg-accent/10 p-2 text-accent">
              <ReceiptText size={17} />
            </span>
          </div>
          {invoiceRows.length === 0 ? (
            <EmptyState title="No invoices yet" description="Create an invoice linked to a collaboration to track payment." />
          ) : (
            <ul className="divide-y divide-line">
              {invoiceRows.map((row) => (
                <li key={row.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-xl bg-panel p-2.5 text-slate-500">
                      <FileText size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{row.invoice_number}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatMoney(row.amount, row.currency)}
                        {row.due_date ? ` · Due ${formatDate(row.due_date)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <InvoiceStatus status={row.status} />
                    {row.status !== 'paid' ? (
                      <Button
                        onClick={() => updateInvoice.mutate({ id: row.id, status: 'paid' })}
                        disabled={updateInvoice.isPending}
                      >
                        <CircleDollarSign size={15} />
                        {updateInvoice.isPending && updateInvoice.variables?.id === row.id ? 'Updating…' : 'Mark paid'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">Transaction history</h3>
            <p className="mt-1 text-xs text-slate-500">Income and expenses recorded in your account.</p>
          </div>
          <Select
            className="w-full sm:w-44"
            value={txType}
            onChange={(event) => setTxType(event.target.value)}
            aria-label="Filter transactions by type"
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </div>
        {transactionRows.length === 0 ? (
          <EmptyState
            title={txType ? `No ${txType} transactions` : 'No transactions yet'}
            description="Record income or expenses to build your financial history."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">Transaction</th>
                  <th scope="col" className="px-3 py-3">Category</th>
                  <th scope="col" className="px-3 py-3">Date</th>
                  <th scope="col" className="px-3 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {transactionRows.map((row) => {
                  const expense = row.type === 'expense';
                  const AmountIcon = expense ? ArrowDownRight : ArrowUpRight;
                  return (
                    <tr key={row.id} className="transition hover:bg-panel/60">
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="rounded-lg p-2"
                            style={{
                              color: expense ? 'var(--danger)' : 'var(--success)',
                              backgroundColor: `color-mix(in srgb, var(${expense ? '--danger' : '--success'}) 12%, transparent)`,
                            }}
                          >
                            <AmountIcon size={15} />
                          </span>
                          <span className="max-w-64 truncate text-sm font-medium text-ink">
                            {row.description || row.category || labelize(row.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-slate-500">{row.category || labelize(row.type)}</td>
                      <td className="px-3 py-3.5 text-sm text-slate-500">{formatDate(row.transaction_date)}</td>
                      <td
                        className="px-3 py-3.5 text-right text-sm font-semibold"
                        style={{ color: expense ? 'var(--danger)' : 'var(--success)' }}
                      >
                        {expense ? '−' : '+'} {formatMoney(row.amount, row.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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

function FormHeading({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
        <Icon size={18} />
      </span>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function InvoiceStatus({ status }) {
  const tones = { paid: 'green', overdue: 'rose', sent: 'blue', draft: 'slate' };
  return <Badge tone={tones[status] || 'amber'}>{labelize(status)}</Badge>;
}

function QueryNote({ message }) {
  return (
    <p role="status" className="text-xs" style={{ color: 'var(--danger)' }}>
      {message}
    </p>
  );
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading finance" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[28rem]" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}

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

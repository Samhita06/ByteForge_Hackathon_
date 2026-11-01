import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient.js';
import { Card, Badge } from '../components/ui/card.jsx';
import { Button } from '../components/ui/button.jsx';
import { Field, Input, Select } from '../components/ui/input.jsx';
import { PageSkeleton } from '../components/feedback/skeleton.jsx';
import { EmptyState, ErrorState } from '../components/feedback/empty-state.jsx';
import { useToast } from '../components/feedback/toast.jsx';
import { formatDate, formatMoney, labelize } from '../utils/format.js';

export function FinancePage() {
  const toast = useToast();
  const client = useQueryClient();
  const [txType, setTxType] = useState('');
  const [txForm, setTxForm] = useState({
    type: 'income',
    amount: '',
    currency: 'INR',
    category: '',
    transaction_date: '',
    description: '',
    collaboration_id: '',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    collaboration_id: '',
    invoice_number: '',
    amount: '',
    currency: 'INR',
    issue_date: '',
    due_date: '',
    status: 'sent',
  });

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
  });

  if (dashboard.isLoading || transactions.isLoading || invoices.isLoading) return <PageSkeleton />;
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} onRetry={dashboard.refetch} />;

  const financials = dashboard.data.data.financials;
  const collabs = collaborations.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Finance</h1>
        <p className="text-sm text-slate-600">
          Received earnings come from income transactions only. Marking an invoice paid records one linked income
          entry so revenue is not double-counted.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Received</p>
          <p className="mt-2 text-2xl font-extrabold">{formatMoney(financials.receivedEarnings, financials.reportingCurrency)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Expenses</p>
          <p className="mt-2 text-2xl font-extrabold">{formatMoney(financials.expenses, financials.reportingCurrency)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Net</p>
          <p className="mt-2 text-2xl font-extrabold">{formatMoney(financials.netEarnings, financials.reportingCurrency)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending invoices</p>
          <p className="mt-2 text-2xl font-extrabold">{formatMoney(financials.pendingInvoiceTotal, financials.reportingCurrency)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Record a transaction</h2>
          <form
            className="space-y-3"
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
            <Field label="Type" htmlFor="type">
              <Select id="type" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>
            </Field>
            <Field label="Amount" htmlFor="amount">
              <Input id="amount" type="number" min="0" step="0.01" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} required />
            </Field>
            <Field label="Currency" htmlFor="tx-currency">
              <Input id="tx-currency" maxLength={3} value={txForm.currency} onChange={(e) => setTxForm({ ...txForm, currency: e.target.value })} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor="transaction_date">
              <Input id="transaction_date" type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} />
            </Field>
            <Field label="Collaboration (optional)" htmlFor="tx-collab">
              <Select id="tx-collab" value={txForm.collaboration_id} onChange={(e) => setTxForm({ ...txForm, collaboration_id: e.target.value })}>
                <option value="">None</option>
                {collabs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.brand_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description" htmlFor="tx-desc">
              <Input id="tx-desc" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} />
            </Field>
            <Button type="submit" disabled={createTx.isPending}>Save transaction</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Create invoice</h2>
          <form
            className="space-y-3"
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
              <Select id="inv-collab" value={invoiceForm.collaboration_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, collaboration_id: e.target.value })} required>
                <option value="">Select a deal</option>
                {collabs.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.brand_name} · {row.campaign_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Invoice number" htmlFor="invoice_number">
              <Input id="invoice_number" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })} required />
            </Field>
            <Field label="Amount" htmlFor="inv-amount">
              <Input id="inv-amount" type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
            </Field>
            <Field label="Currency" htmlFor="inv-currency">
              <Input id="inv-currency" maxLength={3} value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })} />
            </Field>
            <Field label="Issue date" htmlFor="issue_date">
              <Input id="issue_date" type="date" value={invoiceForm.issue_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })} />
            </Field>
            <Field label="Due date" htmlFor="due_date">
              <Input id="due_date" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
            </Field>
            <Button type="submit" disabled={createInvoice.isPending}>Create invoice</Button>
          </form>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Invoices</h2>
        </div>
        {(invoices.data?.data || []).length === 0 ? (
          <EmptyState title="No invoices" description="Create an invoice linked to a collaboration." />
        ) : (
          <ul className="space-y-3">
            {(invoices.data.data || []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-panel p-3">
                <div>
                  <p className="font-medium">{row.invoice_number}</p>
                  <p className="text-sm text-slate-500">
                    {formatMoney(row.amount, row.currency)} · {formatDate(row.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === 'paid' ? 'green' : 'amber'}>{labelize(row.status)}</Badge>
                  {row.status !== 'paid' ? (
                    <Button onClick={() => updateInvoice.mutate({ id: row.id, status: 'paid' })}>Mark paid</Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Transaction history</h2>
          <Select value={txType} onChange={(e) => setTxType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </div>
        {(transactions.data?.data || []).length === 0 ? (
          <EmptyState title="No transactions" description="Record income or expenses to build your history." />
        ) : (
          <ul className="space-y-3">
            {(transactions.data.data || []).map((row) => (
              <li key={row.id} className="flex justify-between gap-3 rounded-xl bg-panel p-3">
                <div>
                  <p className="font-medium">{row.description || row.category || labelize(row.type)}</p>
                  <p className="text-xs text-slate-500">{formatDate(row.transaction_date)}</p>
                </div>
                <p className={row.type === 'expense' ? 'font-semibold text-rose-700' : 'font-semibold text-emerald-700'}>
                  {row.type === 'expense' ? '−' : '+'}
                  {formatMoney(row.amount, row.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, BriefcaseBusiness, CalendarDays, CircleDollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button.jsx';
import { Card } from '../../components/ui/card.jsx';
import { Field, Input, Select, Textarea } from '../../components/ui/input.jsx';

const schema = z.object({
  brand_name: z.string().min(1, 'Brand name is required'),
  campaign_name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  agreed_amount: z.coerce.number().min(0),
  currency: z.string().length(3),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
});

export function CollaborationForm({ defaultValues, onSubmit, submitting, submitLabel }) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_name: '',
      campaign_name: '',
      description: '',
      agreed_amount: 0,
      currency: 'INR',
      status: 'active',
      start_date: '',
      deadline: '',
      ...defaultValues,
    },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
            <BriefcaseBusiness size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Campaign details</h3>
            <p className="mt-1 text-xs text-slate-500">Add the brand and campaign information.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name" htmlFor="brand_name" error={form.formState.errors.brand_name?.message}>
            <Input id="brand_name" placeholder="e.g. Northstar Studio" {...form.register('brand_name')} />
          </Field>
          <Field label="Campaign name" htmlFor="campaign_name" error={form.formState.errors.campaign_name?.message}>
            <Input id="campaign_name" placeholder="e.g. Summer launch" {...form.register('campaign_name')} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <span className="rounded-xl bg-accent-2/10 p-2.5 text-accent-2">
            <CircleDollarSign size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Terms and timeline</h3>
            <p className="mt-1 text-xs text-slate-500">Track the agreed value and key dates.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Agreed amount" htmlFor="agreed_amount" error={form.formState.errors.agreed_amount?.message}>
            <Input id="agreed_amount" type="number" step="0.01" min="0" {...form.register('agreed_amount')} />
          </Field>
          <Field label="Currency" htmlFor="currency" error={form.formState.errors.currency?.message}>
            <Input id="currency" maxLength={3} placeholder="INR" {...form.register('currency')} />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" {...form.register('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Start date" htmlFor="start_date">
            <Input id="start_date" type="date" {...form.register('start_date')} />
          </Field>
          <Field label="Deadline" htmlFor="deadline">
            <Input id="deadline" type="date" {...form.register('deadline')} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-panel p-2.5 text-slate-500">
            <CalendarDays size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Campaign notes</h3>
            <p className="mt-1 text-xs text-slate-500">Optional context, scope, or requirements.</p>
          </div>
        </div>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            rows={4}
            placeholder="Add campaign goals, deliverable expectations, or other useful details."
            {...form.register('description')}
          />
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
          {!submitting ? <ArrowRight size={15} /> : null}
        </Button>
      </div>
    </form>
  );
}

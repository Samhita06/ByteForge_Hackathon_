import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/button.jsx';
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
    <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Brand name" htmlFor="brand_name" error={form.formState.errors.brand_name?.message}>
        <Input id="brand_name" {...form.register('brand_name')} />
      </Field>
      <Field label="Campaign name" htmlFor="campaign_name" error={form.formState.errors.campaign_name?.message}>
        <Input id="campaign_name" {...form.register('campaign_name')} />
      </Field>
      <Field label="Agreed amount" htmlFor="agreed_amount">
        <Input id="agreed_amount" type="number" step="0.01" min="0" {...form.register('agreed_amount')} />
      </Field>
      <Field label="Currency" htmlFor="currency">
        <Input id="currency" maxLength={3} {...form.register('currency')} />
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
      <div className="md:col-span-2">
        <Field label="Description" htmlFor="description">
          <Textarea id="description" rows={3} {...form.register('description')} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

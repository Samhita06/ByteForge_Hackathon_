-- Atomically mark an owned invoice paid and create its linked income row.
-- The existing partial unique index on (user_id, invoice_id) for income rows
-- is required for the ON CONFLICT clause below.

do $$
begin
  if pg_catalog.to_regclass('public.transactions_one_income_per_invoice_idx') is null then
    raise exception 'Required index public.transactions_one_income_per_invoice_idx is missing';
  end if;
end;
$$;

create or replace function public.mark_invoice_paid(p_invoice_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice public.invoices%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select invoice.*
    into v_invoice
    from public.invoices as invoice
   where invoice.id = p_invoice_id
     and invoice.user_id = v_user_id
   for update;

  if not found then
    return null;
  end if;

  if v_invoice.status <> 'paid' or v_invoice.paid_at is null then
    update public.invoices as invoice
       set status = 'paid',
           paid_at = coalesce(invoice.paid_at, pg_catalog.statement_timestamp())
     where invoice.id = v_invoice.id
       and invoice.user_id = v_user_id
    returning invoice.* into v_invoice;
  end if;

  insert into public.transactions (
    user_id,
    collaboration_id,
    invoice_id,
    type,
    amount,
    currency,
    category,
    transaction_date,
    description
  )
  values (
    v_invoice.user_id,
    v_invoice.collaboration_id,
    v_invoice.id,
    'income',
    v_invoice.amount,
    v_invoice.currency,
    'invoice_payment',
    coalesce(v_invoice.paid_at::date, current_date),
    'Payment for invoice ' || v_invoice.invoice_number
  )
  on conflict (user_id, invoice_id)
    where invoice_id is not null and type = 'income'
  do nothing;

  return pg_catalog.to_jsonb(v_invoice);
end;
$$;

revoke all on function public.mark_invoice_paid(uuid) from public;
revoke all on function public.mark_invoice_paid(uuid) from anon;
grant execute on function public.mark_invoice_paid(uuid) to authenticated;

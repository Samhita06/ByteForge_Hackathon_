# Database schema

PostgreSQL (Supabase). UUID primary keys. RLS enabled on all user-owned tables.

## Tables

- **profiles**: `id` = `auth.users.id`. Profile fields plus `reporting_currency` (default `INR`).
- **collaborations**: brand/campaign deal owned by `user_id`.
- **deliverables**: tasks owned by `user_id`, FK to `collaborations`.
- **content_items**: planner rows, optional `collaboration_id`.
- **invoices**: required `collaboration_id`, unique `(user_id, invoice_number)`.
- **transactions**: income/expense rows, optional collaboration and invoice FKs.
- **ai_recommendations**: stored Copilot payloads.

A signup trigger inserts a profile row.

Ownership triggers reject linked collaborations or invoices that belong to another user.

## RLS

Policies allow `auth.uid()` to read/write only their own rows. The API uses the user's JWT (anon key + bearer token), not the service role, for CRUD.

## Financial calculation rules

**Received earnings** = sum of `transactions.amount` where `type = 'income'` and `currency = profiles.reporting_currency`.

**Expenses** = sum of expense transactions in the reporting currency.

**Net earnings** = received − expenses.

**Pending invoice total** = sum of invoices with status `draft`, `sent`, or `overdue` in the reporting currency.

Paid invoice amounts are **not** added on top of income. When an invoice is marked `paid`, the backend inserts one `income` transaction with `invoice_id` set if none exists.

Records in other currencies are excluded from totals. The API reports `excludedOtherCurrencyCount`. There is no FX conversion in the MVP.

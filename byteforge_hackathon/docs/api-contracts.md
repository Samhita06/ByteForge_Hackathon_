# ByteForge API contracts

Base URL: backend origin (local default `http://localhost:4000`).

Protected routes require `Authorization: Bearer <supabase_access_token>`.

Error shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body", "details": {} } }
```

List responses:

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 0 }
```

Single-resource responses: `{ "data": { } }`.

## System

### GET `/api/health`

Unauthenticated. Returns `{ "status": "ok", "service": "byteforge-api", "supabaseConfigured": true, "geminiConfigured": false, "time": "..." }`.

## Profile

### GET `/api/profile`

### PATCH `/api/profile`

Body (all optional): `display_name`, `username`, `bio`, `niche`, `primary_platform` (`instagram|youtube|tiktok|linkedin|other`), `reporting_currency` (ISO 4217, 3 letters).

## Collaborations

### GET `/api/collaborations?status=&q=&page=&pageSize=`

### POST `/api/collaborations`

Required: `brand_name`, `campaign_name`. Optional: `description`, `agreed_amount` (>= 0), `currency`, `status` (`draft|active|completed|cancelled`), `start_date`, `deadline`.

### GET `/api/collaborations/:id`

### PATCH `/api/collaborations/:id`

### DELETE `/api/collaborations/:id`

Returns 204.

## Deliverables

### GET `/api/deliverables?collaboration_id=&status=`

### POST `/api/deliverables`

Required: `collaboration_id`, `title`. Optional: `description`, `due_date`, `status` (`pending|in_progress|completed|cancelled`).

### PATCH `/api/deliverables/:id`

### DELETE `/api/deliverables/:id`

## Content

### GET `/api/content?platform=&status=&month=YYYY-MM`

### POST `/api/content`

Required: `title`, `platform`. Optional: `content_type`, `scheduled_date`, `status` (`idea|scheduled|in_progress|published|cancelled`), `collaboration_id`, `description`.

`published` means the creator marked the item published manually. The API does not post to social networks.

### PATCH `/api/content/:id`

### DELETE `/api/content/:id`

## Finance

### GET `/api/transactions?type=&from=&to=`

### POST `/api/transactions`

Required: `type` (`income|expense`), `amount` (>= 0). Optional: `currency`, `category`, `transaction_date`, `description`, `collaboration_id`, `invoice_id`.

### PATCH `/api/transactions/:id`

### DELETE `/api/transactions/:id`

### GET `/api/invoices?status=`

### POST `/api/invoices`

Required: `collaboration_id`, `invoice_number`, `amount`. Optional: `currency`, `issue_date`, `due_date`, `status` (`draft|sent|paid|overdue|cancelled`).

### PATCH `/api/invoices/:id`

Setting `status` to `paid` atomically sets `paid_at` and creates one income transaction from the stored invoice values if none exists. Send the payment status change separately from edits to other invoice fields.

## Analytics

### GET `/api/dashboard/summary`

Returns counts, financials in `reporting_currency`, active collaborations, upcoming deliverables, scheduled content, activity, and deadlines.

## AI

### GET `/api/ai/recommendations`

Returns the authenticated user's latest saved recommendation payload as `{ data: { source, warning, recommendations, generatedAt } }`, or `{ data: null }` when none exists.

### POST `/api/ai/recommendations`

Returns `{ source: "ai" | "rule-based", warning, recommendations, generatedAt }`. Each recommendation has `title`, `explanation`, `priority`, `sourceRecord`, `suggestedNextAction`.

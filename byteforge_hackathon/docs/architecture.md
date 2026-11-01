# ByteForge architecture

ByteForge is a modular monolith: a React + Vite SPA talks to a Node.js/Express REST API, which reads and writes Supabase PostgreSQL using the signed-in user's JWT so Row Level Security stays in force.

## Layers

- **Frontend** (`frontend/`): pages, feature forms, design system, TanStack Query, Supabase Auth session.
- **Backend** (`backend/`): HTTP controllers, domain services, repositories, validation, JWT verification.
- **Database** (`supabase/migrations/`): relational schema, constraints, ownership triggers, RLS policies.

## Request flow

1. The creator signs in with Supabase Auth in the browser.
2. The SPA stores the session and sends `Authorization: Bearer <access_token>` to `/api/*`.
3. Auth middleware verifies the JWT with Supabase and builds a user-scoped Supabase client.
4. Controllers parse HTTP, services apply business rules, repositories query tables.
5. RLS plus `user_id` filters prevent cross-user access. Linked collaborations/invoices must belong to the same user.

## Module map

| Domain | Backend | Frontend |
| --- | --- | --- |
| Auth/profile | `modules/creators` | `features/auth`, Settings |
| Collaborations | `modules/collaborations` | Collaborations page |
| Deliverables | `modules/deliverables` | Collaboration details |
| Content | `modules/content` | Content planner |
| Finance | `modules/finance` | Finance page |
| Dashboard | `modules/analytics` | Dashboard page |
| Copilot | `modules/ai` | Copilot page |

## Authentication

- Register/sign-in/sign-out: Supabase Auth (email/password).
- Backend never trusts a client-supplied `user_id`.
- Privileged service-role keys are not used in request handling and must never appear in `VITE_*` variables.

## AI

Exact totals are computed in SQL/application code. Gemini (optional) receives a bounded JSON context of saved records. If the key is missing or the provider fails, a deterministic rule engine runs and the UI labels the result as rule-based.

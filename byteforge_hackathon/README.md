# ByteForge

ByteForge is a creator-business command center for independent creators. It connects profile management, brand collaborations, deliverables, content planning, invoices/earnings, a live dashboard, and a grounded Copilot.

This repository is a hackathon MVP: a real full-stack app with persistence and auth, not a static prototype.

## Features

- Email/password authentication (Supabase Auth)
- Brand collaboration CRUD, search, status filters, linked deliverables
- Monthly content planner (planning only — it does not publish posts)
- Income, expenses, invoices, and payment state
- Dashboard totals from stored records
- AI Copilot with Gemini when configured, otherwise a labeled rule-based fallback

## Architecture

React + Vite frontend, Express REST API, Supabase PostgreSQL with Row Level Security. See `docs/architecture.md`.

## Requirements

- Node.js 20+
- npm
- A Supabase project (URL + anon key)
- Optional Gemini API key

## Local setup

1. Copy `frontend/.env.example` to `frontend/.env` and `backend/.env.example` to `backend/.env`.
2. Run `supabase/migrations/202610300001_init.sql` in the Supabase SQL editor.
3. Install and start both apps:

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Frontend: http://localhost:5173  
API health: http://localhost:4000/api/health

## Environment variables

See `.env.example`. Browser variables must stay limited to `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

## Tests

```bash
cd backend && npm test
```

## Production build

```bash
cd frontend && npm run build
cd backend && npm start
```

## Deployment

- Frontend on Vercel (`frontend` app, `dist` output)
- Backend on a Node host with `npm start`
- Database on Supabase

Set `FRONTEND_ORIGIN` on the API to the deployed frontend origin. Public URLs are not listed here until they are verified.

## Docs

- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/database-schema.md`
- `docs/implementation-playbook.md`
- `docs/demo-script.md`

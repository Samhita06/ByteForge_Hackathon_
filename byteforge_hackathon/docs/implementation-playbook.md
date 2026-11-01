# Implementation playbook

## 1. Prerequisites

- Node.js 20+
- npm
- A Supabase project

## 2. Supabase

1. Create a project.
2. Authentication → Providers → Email enabled.
3. For local/hackathon demos, disable “Confirm email” if you need immediate sign-in.
4. SQL editor: paste and run `supabase/migrations/202610300001_init.sql`.
5. Copy Project URL and anon public key.

Do not put the service role key in the frontend or in `VITE_*` variables.

## 3. Environment files

Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Create `backend/.env`:

```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

`GEMINI_API_KEY` is optional. Without it, Copilot uses the rule engine.

## 4. Run locally

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Confirm http://localhost:4000/api/health returns `status: ok`.

## 5. Tests and build

```bash
cd backend && npm test
cd frontend && npm run build
```

## 6. Troubleshooting

- 401 after refresh: session missing; sign in again.
- 503 on API: `SUPABASE_URL` / `SUPABASE_ANON_KEY` not set on the backend.
- Cannot delete a collaboration: an invoice still references it (`ON DELETE RESTRICT`).
- CORS errors: set `FRONTEND_ORIGIN` to the exact frontend origin, including production URL.

## 7. Deployment

- Frontend: Vercel, root `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Backend: any Node host (Render/Railway/Fly). Start command `npm start`. Set `FRONTEND_ORIGIN` to the Vercel URL.
- Confirm `/api/health` on the public API URL, then register a test creator and complete the demo script.

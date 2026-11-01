# Judge demo script (about 2.5 minutes)

1. **Open the live app** and say: ByteForge is a creator business command center that connects brand deals, content plans, money, and next actions.
2. **Register or sign in** with a demo account. Mention real Supabase Auth, not a fake login screen.
3. **Settings (15s):** set niche, primary platform, reporting currency.
4. **Collaborations (40s):** create a brand deal with amount and deadline. Add a deliverable and change its status.
5. **Content planner (20s):** add a scheduled reel. Say clearly this does not publish to Instagram.
6. **Finance (30s):** create an invoice for the deal, mark it paid, show the income transaction. Point at received vs pending vs expenses. Explain no double counting.
7. **Dashboard (20s):** refresh. Numbers come from those records.
8. **Copilot (25s):** generate recommendations. If Gemini is on, label AI-generated; otherwise show rule-based labels. Note that it uses saved deadlines/invoices, not invented analytics.
9. **Architecture (20s):** React + Express + Supabase, RLS, JWT on every API call, modular monolith.

## Known limitations

- No social publishing or OAuth integrations in this MVP.
- No currency conversion.
- Collaboration delete is blocked while invoices exist.
- Copilot cannot see platform performance unless the creator recorded it.
- Production-readiness and load testing are not claimed.

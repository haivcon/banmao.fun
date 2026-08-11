# BANMAO AI local operations

## Runtime and safety

- Node.js Route Handlers stream SSE and use `no-store`. No provider/model fallback exists.
- All flags default off. Browser requests are same-origin `/api/ai/*`; only the server client knows the fixed upstream.
- Current limiter, nonce and transaction draft state is process-local; session state is an authenticated HttpOnly cookie. This is suitable only for deterministic local verification, not Vercel multi-instance production. An approved atomic distributed store is required before external canary.
- Prompt budgets are deterministic byte/token estimates. Logs must use allowlisted fields only; raw prompts, wallet addresses, authorization values, upstream bodies and credentials are prohibited.

## Local gates

Run typecheck, Jest, lint, build, `git diff --check`, secret-name/client-bundle scan and no-write-tool scan. Live upstream, Vercel Preview streaming/limits, dashboards, alert delivery, distributed-store behavior and browser E2E are NOT_RUN locally.

## Incidents

Set `AI_CHAT_ENABLED=false` first. Disable the affected advisor/RAG/tools/transaction flag independently. Expire AI sessions for auth/privacy incidents. Credential rotation, environment mutation and deployment require owner approval and are not local implementation actions.

# BANMAO AI rollout and rollback readiness

## Local release order

1. Keep every flag off and verify the launcher is absent and APIs are disabled.
2. Internal Preview: chat text only; tools, RAG, domain advisors and transaction copilot off.
3. Internal only: enable RAG and one read-only advisor after its approved data adapter and distributed limiter exist.
4. Read-only canary: expand only after product/security owners set concrete SLO thresholds.
5. Transaction prepare/simulate: authenticated internal cohort only, after distributed nonce/draft storage and review of the X Layer `eth_call`/gas/read-back adapter. AI never signs or submits; the browser signature is SIWE authentication only.

Vercel Preview, canary creation, environment mutation and deployment are **BLOCKED pending explicit deploy approval**. No thresholds or owner names are invented here. Playwright/browser E2E is **NOT_RUN** because adding that dependency was not explicitly approved; Jest covers pure state/contracts only.

## Rollback drill (documented, not remotely executed)

1. Set global chat flag off; read back disabled API and absent launcher.
2. Disable only the affected module flag when isolated. Never switch provider/model as fallback.
3. Expire AI sessions for auth/transaction/privacy incidents.
4. Verify Landing, DeFi, GameFi, Collection and Push user chat independently.
5. Preserve redacted evidence; roll forward only after root cause, regression test and fresh approval.

Local code rollback uses narrow AI pathspecs and the `app/layout.tsx` mount hunk. Never reset/delete unrelated dirty work.

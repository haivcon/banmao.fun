# AI threat model

## Enforced locally

- Credential and upstream client are server-only; browser input cannot choose a provider URL.
- The only accepted and exposed model is `banmao.fun`; invalid request values fail closed and no request fallback exists. Persisted `open9` and `xenon1` session preferences are explicitly migrated with a visible notice.
- Context derives from allowlisted pathname prefixes.
- Tool descriptors are closed, context-scoped, bounded, deterministic, and read-only. There is no `writeContract`, signer, send, or submit tool.
- Retrieved text is untrusted evidence with provenance, never policy.
- Chat, tools, RAG, and transaction copilot flags default off.

## Blocked production decisions

Security/product owners must approve retention, consent text, SIWE domain/URI/chains and atomic store, distributed limiter, vector/embedding service, corpus owners, token/cost ceilings, financial policy, canary cohort, Vercel limits, and incident owners before production enable. Local defaults do not claim those approvals.

Transaction work remains prepare/simulate-only and disabled by default. SIWE proofs are domain/URI/chain/nonce/time bound, drafts are wallet/hash/expiry bound and consumed once for a read-only `eth_call` simulation. Authentication never grants generic mutation capability; there is no server signer or submit path.

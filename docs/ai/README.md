# BANMAO AI (local foundation)

Server-only OpenAI-compatible base URL: `https://xlayerbot.fun/v1`. The local implementation uses native fetch and SSE. No provider/model fallback is permitted.

## Capability evidence

| Capability | Evidence | State |
|---|---|---|
| `/v1/models` route | unauthenticated metadata-only probe returned HTTP 401 | endpoint reachable; authenticated schema unverified |
| chat streaming | not probed without an approved credential read | blocked; covered locally with deterministic mocks |
| tool calling / usage / embeddings | not probed without an approved credential read | blocked |

No secret value, authorization header, or upstream response body was read or recorded. Local tests use placeholder credentials only.

## Local verification

`npm test -- --runInBand __tests__/ai`
`npm run typecheck`
`npm run lint`
`npm run build`

## Verified local capability boundary

- Chat streams through same-origin server routes to the fixed upstream; models are allowlisted and there is no fallback. A versioned layered Banmao persona applies character, surface-specific guidance, factual policy, language selection, novelty cues, and untrusted RAG evidence without loading the full portable character bible into every request.
- Optional memory remains browser-tab-only and sends bounded prior turns and topic/motif cues; the server does not persist conversation state.
- DeFi adapters read staking protocol/wallet state, burn balances, and stored airdrop records. FOMO reads the deployed mainnet contract. Market readers use strict OKX endpoint allowlists. Every result carries source and observation time; failures are typed unavailable rather than mock data.
- BanmaoBox create is hidden because `deployments/banmaobox-xlayer-mainnet.json` records `deployed=false` and `address=null`. BanMaoPK is unavailable because its only checked-in address is explicitly X Layer Testnet and no chain-196 deployment manifest exists. Collection search/prompts use bounded Cloudinary readers, and collection quests use SELECT-only Hub database reads; failures remain typed unavailable.
- Transaction Copilot signs SIWE authentication text only, prepares a wallet-bound expiring draft, reads token balance/allowance/staking summary at the simulation block, and consumes the draft only after successful read execution. RPC failure preserves an unexpired draft for retry. It contains no transaction signing or submission path.
- All feature flags default off. Production rejects `AI_TX_COPILOT_ENABLED=true` unless `AI_DISTRIBUTED_STATE_READY=true`; set that only after the process-local limiter, nonce store and draft store have been replaced by an approved atomic distributed store.

## Exact local environment

Required for chat: `AI_API_KEY`, `AI_CHAT_ENABLED=true`. Keep `AI_DEFAULT_MODEL=banmao.fun`. Enable `AI_TOOLS_ENABLED`, `AI_RAG_ENABLED`, and the module flags only for capabilities you want exposed. `XLAYER_RPC_URL` is optional because the public X Layer endpoint is the read-only default. Transaction Copilot additionally requires `AI_TX_COPILOT_ENABLED=true`, `AI_SESSION_SECRET`, SIWE origin/domain values, and production distributed-state readiness. No Collection self-URL or internal API key is required. All values are server-only; never use `NEXT_PUBLIC_`.

Use the BANMAO AI block in `.env.example` as the placeholder template. Keep every value server-only and replace all placeholder values in the deployment environment; do not commit real credentials.

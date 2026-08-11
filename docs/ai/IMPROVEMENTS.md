# BANMAO AI reliability and privacy improvements

## Retrieval

Retrieval uses deterministic BM25 by default. `retrieveHybrid` accepts an injected `SemanticProvider` and fuses normalized lexical (60%) and semantic (40%) scores while retaining document/version/source provenance. No live embedding endpoint is assumed. If no provider is configured, the reported mode is explicitly `lexical`; the selected chat model is never changed.

## Streaming and tools

Upstream text deltas are emitted incrementally at safety-buffered sentence boundaries. Financial-language checks run before a buffered segment is exposed. Tool-call fragments are assembled completely before execution. Independent calls in one round execute concurrently, while result messages are appended in original call order. Read-only descriptors may set `cacheTtlMs`; the registry cache is TTL-bound, size-bound, keyed by tool name plus validated arguments, and excludes errors/unavailable results.

`defi.portfolio` is read-only and validates X Layer chain 196 plus a supplied wallet with strict Zod schemas. It aggregates native balance, BANMAO balance, staking reads, and public Hub profile reads. Every source records availability; partial failures remain visible with block/as-of provenance.

## Browser memory

Conversation persistence is disabled by default. When the user opts in, a versioned bounded record is stored in localStorage under `banmao-ai-memory-v1`, expires after 30 minutes, and contains at most 20 turns. Disabling or clearing memory removes persisted content. Wallet addresses and session/wallet secrets are not added to conversation memory by the memory module.

## Language and prompts

The focused typed AI locale module covers exactly `en`, `vi`, `zh`, `ko`, `ru`, and `id`, normalizes regional tags, detects the latest input language, and produces deterministic bounded prompts from surface and visible allowlisted page elements. The system prompt requires the latest input language to override UI locale while preserving code, token symbols, model identifiers, URLs, and addresses.

## Recovery and metrics

The browser retries only network failures, HTTP 429, and HTTP 5xx, with capped exponential-style jitter and at most one automatic retry. It reuses the same request body and model and never silently falls back. Existing retry UI remains available for explicit retry.

Structured `banmao_ai_metric` records contain allowlisted request/model, duration/status, RAG mode/hits, tool timing/status, retry count, and error codes. Prompt text, history, and wallet addresses are excluded.

## Page action safety

Transaction-risk page controls require review followed by a separate confirmation before activation. Action fingerprints bind the reviewed ID, label, action, and risk to the current DOM element, and action IDs cannot execute twice. This only activates the allowlisted page control; wallet review/signature remains outside BANMAO AI.

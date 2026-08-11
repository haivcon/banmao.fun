# RAG sources

The local lexical foundation accepts only the repository-relative allowlist in `lib/ai/server/rag/corpus.ts`. It currently includes:

- AI policy and operations: `docs/ai/README.md`, `PRIVACY.md`, `THREAT_MODEL.md`, `RAG_SOURCES.md`, `OPERATIONS.md`, and `ROLLOUT.md`
- Character and product knowledge: `docs/ai/BANMAO_PERSONA.md` and `docs/ai/DOMAIN_KNOWLEDGE.md`
- Canonical repository documentation: `README.md`, `contracts/README.md`, and `app/gamefi/banmaoslots/PROJECT_DOCUMENTATION.md`

The corpus intentionally indexes reviewed prose rather than arbitrary source code. A checked-in contract or UI is evidence of implementation work, not proof of a live deployment. Time-sensitive state must come from approved read tools and current manifests.

Each indexed chunk carries document ID, version, source path, content hash, and deterministic chunk ID. `.env*`, user content, generated ABI, deployment secrets, raw databases, symlinks/path traversal, binary and oversized input are outside the corpus.

Semantic embeddings and a production vector store are not configured; this implementation must be described as lexical retrieval, not semantic search. Corpus changes require review and version ownership before enablement.

# RAG sources

The local lexical foundation accepts only these repository-relative sources:

- `docs/ai/README.md`
- `docs/ai/PRIVACY.md`
- `docs/ai/THREAT_MODEL.md`
- `docs/ai/RAG_SOURCES.md`

Each indexed chunk carries document ID, version, source path, content hash, and deterministic chunk ID. `.env*`, user content, generated ABI, deployment secrets, symlinks/path traversal, binary and oversized input are outside the corpus.

Semantic embeddings and a production vector store are not configured; this implementation must be described as lexical retrieval, not semantic search. Corpus ownership/version approval is still required before enablement.

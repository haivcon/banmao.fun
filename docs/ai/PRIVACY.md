# AI privacy

Default local policy: no durable server conversation memory. With memory disabled, prior turns are not sent as conversation context. When the user explicitly enables bounded tab memory, the browser retains up to 20 short-lived turns for 30 minutes and sends at most 12 recent turns plus bounded topic/motif cues with the next request. Disabling memory, clearing chat, or closing the tab removes that in-memory state. Wallet hints are not proof of ownership. Raw prompts, conversation history, wallet addresses, credentials, upstream payloads, and tool payloads must not be logged.

Production retention, export/delete guarantees, consent copy, pseudonymous identifiers, and store TTL remain blocked on privacy/security owner approval. Until approved, server memory stays disabled.

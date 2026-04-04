# Product Decisions

Architectural and UX decisions made during development. Reference this before implementing related features to stay consistent.

---

## Signing Request Display Model

**Decision:** One row per signer (dashboard flattens `signers[]` across all requests).

**Context:** When a document is sent to multiple people, it is stored as a single `SigningRequest` with a `signers[]` array. The dashboard flattens this into individual rows — one per signer — so the admin immediately sees who has signed, who is pending, and who declined without any extra clicks.

**Why:**
- Admin's primary question is "who still needs to sign?" — per-signer rows answer this instantly.
- Each row has its own copy-link and remind action scoped to that specific signer.
- Simpler than an avatar stack + modal; no hover or secondary interaction needed.

**Trade-off vs one-row-per-request:** If a document is sent to 10 people, the dashboard shows 10 rows for that document. This is acceptable for now. If it becomes noisy, revisit by grouping rows under a collapsible request header.

**UI pattern:** Avatar circle (initial, colored by signer status) + name + email as primary identity. Request title/filename/date shown as secondary line below.

**Future feature to implement:** Signing order (sequential vs parallel). Currently all signers receive their link simultaneously. Sequential mode = Signer 2 is only emailed after Signer 1 completes. DocuSign calls this "routing order." Requires a `order` field on each signer and logic in the backend to gate email dispatch.

---

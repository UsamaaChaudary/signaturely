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

## Owner Annotations vs Signer Fields — Two Separate Systems

**Decision:** Owner text annotations are stored in a separate `annotations[]` array, not mixed into `fields[]`.

**Context:** Two fundamentally different concepts exist on a document:
- **Signer fields** — interactive placeholders (signature, text, date, checkbox) that signers fill in during the signing session. Stored in `fields[]` with a `signerId`.
- **Owner annotations** — static text the document owner writes directly onto the PDF (labels, pre-filled content, instructions). Stored in `annotations[]` with no signer association.

**Why separate arrays:**
- Keeps the field-processing pipeline (signer mapping, `signerMapping` tempId resolution, per-signer field filtering) completely unchanged.
- Annotations have no concept of `signerId`, `required`, or `value` — mixing them into `fields[]` would require nullable/optional fields everywhere.
- `pdfService.js` draws annotations first (base layer) then signer-submitted field values on top — the draw order is clear and explicit.

**Storage:** Annotations live on both `Template` and `SigningRequest` models. When a signing request is created from a template, annotations are copied into the request at creation time so `pdfService.mergeSignatures(request)` can access them without an extra template lookup.

**Coordinate system:** Same normalized 0–1 fractions as signer fields. pdf-lib Y-axis flip applies identically.

**Rendering precedence (all surfaces):**
1. Raw PDF image (bottom)
2. Owner annotation overlays (middle — read-only)
3. Signer field overlays (top — interactive on signing page, read-only elsewhere)

---

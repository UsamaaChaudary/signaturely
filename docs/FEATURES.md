# Features

Planned features, their scope, and implementation notes.

---

## Planned

### Signing Order (Sequential vs Parallel)
**Priority:** Medium
**Context:** See `PRODUCT_DECISIONS.md` — Signing Request Display Model.
**Scope:**
- Add `order: Number` field to the `signerSchema` in `backend/src/models/SigningRequest.js`.
- On request creation, allow the sender to set a signing order per signer.
- Backend: after each signer completes, check if the next signer (by order) should now receive their email. Gate dispatch in `pdfService.js` / completion handler.
- Frontend: in `send/page.tsx`, add drag-to-reorder UI for signers with a toggle between "All at once" and "In order".
- Dashboard: avatar stack order should reflect signing sequence when ordered mode is active.

### Template Reuse from Dashboard
**Priority:** Low
**Scope:** Quick-send button on templates list to pre-fill the send flow with a saved template's fields.

---

## Shipped

### Avatar Stack + Signers Modal (Dashboard)
**Shipped:** 2026-04-04
**Description:** Dashboard signing request rows show a compact avatar stack (up to 4 avatars + overflow badge) colored by signer status. Clicking opens a modal listing all signers with name, email, and status pill.

---

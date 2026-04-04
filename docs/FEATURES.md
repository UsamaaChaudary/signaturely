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

### Owner Text Annotations (Write on PDF)
**Shipped:** 2026-04-05
**Description:** Admins/owners can type static text directly onto any PDF page before sending for signature. Text boxes are draggable, resizable, support bold toggle, and are saved as part of the template or signing request. Annotations are rendered as read-only overlays on the signing page, in all preview modals, and are baked into the final merged PDF.

**Implementation summary:**
- `backend/src/models/Template.js` — `annotationSchema` + `annotations[]` array on `templateSchema`
- `backend/src/models/SigningRequest.js` — same `annotationSchema` + `annotations[]` on `signingRequestSchema`
- `backend/src/routes/templates.js` — POST and PATCH accept and persist `annotations`
- `backend/src/routes/requests.js` — POST accepts and persists `annotations`
- `backend/src/routes/signing.js` — GET session response includes `annotations`
- `backend/src/services/pdfService.js` — draws annotation text via pdf-lib BEFORE signer fields; `hexToRgb` helper converts hex colors
- `frontend/components/FieldPlacer.tsx` — `Annotation` interface, "Write on PDF" sidebar section, "Add Text Box" tool, inline `<textarea>` editing, parallel drag/resize refs for annotations, amber overlay render layer
- `frontend/app/send/page.tsx` — `annotations` state, loaded from template on edit, passed to FieldPlacer, included in `createTemplate`/`updateTemplate`/`createRequest` API calls; also fixes bug where template edit always created a new template instead of updating
- `frontend/app/sign/[token]/page.tsx` — `SigningAnnotation` interface, renders annotations as `pointer-events-none` overlays on signing page
- `frontend/components/PdfPreviewModal.tsx` — `PreviewAnnotation` interface + `previewAnnotations` prop, renders overlays in all preview modals
- `frontend/app/dashboard/page.tsx` — passes `previewAnnotations` to preview modal
- `frontend/app/templates/page.tsx` — passes `previewAnnotations` to template preview modal

**Annotation schema (normalized 0–1 coordinates, same system as fields):**
```
id, type ("text"), page, x, y, width, height, content, fontSize, bold, color
```

**Known limitation:** `pdf-lib`'s `drawText` does not handle `\n` — newlines in annotation content will not render as line breaks in the final PDF.

---

### Avatar Stack + Signers Modal (Dashboard)
**Shipped:** 2026-04-04
**Description:** Dashboard signing request rows show a compact avatar stack (up to 4 avatars + overflow badge) colored by signer status. Clicking opens a modal listing all signers with name, email, and status pill.

---

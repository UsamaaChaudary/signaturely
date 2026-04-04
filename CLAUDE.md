# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a monorepo with two independent services. Each has its own `package.json`, `node_modules`, and `CLAUDE.md` with service-specific details.

```
signaturely/
├── backend/    # Express.js REST API — port 4000
└── frontend/   # Next.js 16 App Router — port 3000
```

> Read `backend/CLAUDE.md` and `frontend/CLAUDE.md` for service-level architecture, commands, and environment variables.

## Running the Project

Both services must be started independently in separate terminals:

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend dev server defaults to port 3000; backend runs on port 4000. No orchestration tool (docker-compose, turborepo, etc.) is configured.

## Full-Stack Architecture

**Signaturely** is an electronic signature SaaS. The high-level request flow:

1. **Upload** — Owner uploads a PDF; backend stores it in Cloudinary (`signaturely/originals/`).
2. **Field placement** — Frontend renders the PDF via `pdfjs-dist` on `<canvas>`. `FieldPlacer.tsx` lets the owner drag signature/text/checkbox fields onto pages, and add static text annotations (owner-written text baked into the final PDF). Field and annotation positions are stored as percentage-based coordinates (0–1 range).
3. **Send** — Backend creates a `SigningRequest` document. Each signer gets a unique UUID token for their signing session. Annotations are copied from the template into the request at creation time.
4. **Signing** — Signers follow an email link to `/sign/:token` (no auth). They fill fields and submit.
5. **Completion** — When all signers complete, `pdfService.js` uses `pdf-lib` to merge signatures into the PDF, uploads the result to Cloudinary (`signaturely/completed/`), and emails the signed PDF to all parties via Resend.

## Cross-Service Contracts

| Concern | Detail |
|---------|--------|
| Auth | JWT in `Authorization: Bearer` header. Token stored in `localStorage` client-side. 30-day expiry. |
| File storage | `Document.filePath` is always a full Cloudinary HTTPS URL — never a local path. |
| Field coordinates | `x`, `y`, `width`, `height` are fractions (0.0–1.0) of page dimensions. `pdf-lib` converts these to PDF points with Y-axis flip. Same coordinate system is used for annotations. |
| Annotations | Owner-written static text; stored in `annotations[]` (separate from `fields[]`). No `signerId` or `value`. Drawn by `pdfService.js` before signer fields. Rendered read-only on signing page and all preview modals. |
| Signer identification | Each signer's unique `signingToken` (UUID) is the only credential for the public `/api/signing/:token` endpoint. |
| Soft deletes | `status` field (not hard deletes) on Document, Contact, SigningRequest, Template. |

## Data Models at a Glance

- **User** — credentials; owns Documents, Contacts, Templates, SigningRequests
- **Document** — uploaded PDF metadata + Cloudinary URL; can be flagged `isTemplate`
- **SigningRequest** — signing workflow; embeds `signers[]` (with per-signer tokens and status), `fields[]`, and `annotations[]`
- **Template** — reusable field layout; `fields[].signerSlot` is a 1-indexed string mapping to a signer position; also carries `annotations[]`
- **Contact** — address book entry; tracks `totalSent`/`totalCompleted` stats updated via `utils/contactStats.js`

## Environment Setup

```bash
# backend/.env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/signo
JWT_SECRET=<secret>
FRONTEND_URL=http://localhost:3001   # used in signing email links
RESEND_API_KEY=<key>                 # omit to use Ethereal dev mailbox
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## No Test Suite

There are no automated tests in either service. Manual testing is done by running both dev servers.

## Project Docs

All product decisions, planned features, and known bugs are tracked in `/docs`. Read these before implementing anything non-trivial.

| File | Purpose |
|------|---------|
| [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md) | Why things are built the way they are — read before implementing related features |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Planned and shipped features with implementation notes |
| [`docs/BUGS.md`](docs/BUGS.md) | Known bugs, root causes, and fix options |

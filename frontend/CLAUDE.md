# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Run production build
npm run lint       # Run ESLint
```

No test runner is configured. There are no test files in this project.

**Environment:** Create `.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Architecture

This is a Next.js 16 (App Router) e-signature SaaS frontend. The backend runs separately on port 4000.

**Core flows:**
1. **Authenticated flow** — Upload PDF → Place fields (FieldPlacer) → Assign signers → Send request
2. **Public signing flow** — `/sign/[token]` — no auth required; signer fills fields and submits

**Key directories:**
- `app/` — App Router pages. `send/page.tsx` and `sign/[token]/page.tsx` are the two heaviest pages (400+ lines each).
- `components/` — Shared UI. `FieldPlacer.tsx` handles interactive PDF field placement via canvas.
- `lib/api.ts` — Entire API client. Single `apiFetch()` wrapper + flat `api.*` method namespace.
- `lib/auth.ts` — Auth helpers reading/writing `localStorage` (`getToken`, `getUser`, `isAuthenticated`, `useRequireAuth`).

**State management:** No global store. Each page owns its state via `useState` + `useEffect` data fetching. No SWR/React Query.

**Auth:** JWT token in `localStorage`. Protected pages call `useRequireAuth()` which redirects to `/login`. The public `/sign/[token]` page skips auth entirely.

**API layer (`lib/api.ts`):** All requests go to `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). `apiFetch` auto-attaches `Authorization: Bearer` header and handles JSON vs FormData. Completed document URLs are Cloudinary HTTPS URLs returned directly from the API.

**PDF rendering:** `pdfjs-dist` renders PDF pages to `<canvas>` elements client-side. `FieldPlacer.tsx` overlays interactive draggable fields on top.

**UI:** shadcn/ui (style: base-nova) + Tailwind CSS 4. Path alias `@/` maps to the repo root.

**Form handling:** No form library. Inline `onChange` → `setState` pattern throughout.

**`use client` directive:** Required on all interactive pages and components that use hooks or browser APIs.

## Project Docs

Before implementing features or fixing bugs, check the `/docs` folder at the repo root:

- **`docs/PRODUCT_DECISIONS.md`** — UX and architectural decisions with rationale (e.g. signing request display model)
- **`docs/FEATURES.md`** — planned features with frontend implementation notes
- **`docs/BUGS.md`** — known bugs and their fix options

## Known Issues

### PDF Download from Cloudinary (TODO)
**Status:** Download button in `PdfPreviewModal.tsx` is **commented out**.

**Root cause:** Browsers silently ignore the `<a download>` attribute for cross-origin URLs (Cloudinary CDN). Adding `fl_attachment` to the Cloudinary URL does set `Content-Disposition: attachment` but the file is served without a correct `Content-Type: application/pdf` header (because the Cloudinary resource is uploaded as `resource_type: raw`), so macOS/browsers open the bytes as a plain-text file.

**Fix options (pick one):**
1. **Backend proxy route** — Add `GET /api/documents/:id/download` that fetches the Cloudinary URL server-side, pipes the response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=xxx.pdf` headers.
2. **Client-side Blob fetch** — In `PdfPreviewModal`, fetch the file with `fetch(url)`, create `new Blob([data], { type: 'application/pdf' })`, then `URL.createObjectURL` → `<a download>`. Works if Cloudinary CORS allows the origin (add `allowed_origins` in Cloudinary settings).
3. **Re-upload as `resource_type: image`** — Change `cloudinary.js` uploader to use `resource_type: 'auto'` (or `'image'`) so Cloudinary emits the correct MIME type. **Caution:** test that `pdfjs-dist` can still fetch the URL after this change.

The Download button code is preserved in a comment block in `components/PdfPreviewModal.tsx`.

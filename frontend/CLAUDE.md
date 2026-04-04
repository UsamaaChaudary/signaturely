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

**Owner annotations** — A second overlay layer (amber, dashed border) sits between the PDF image and the signer fields. Annotations are owned by the document sender, not signers. The `Annotation` interface is exported from `FieldPlacer.tsx` and used across `send/page.tsx`, `sign/[token]/page.tsx`, and `PdfPreviewModal.tsx`. They are always rendered `pointer-events-none` everywhere except the FieldPlacer editor. See `docs/PRODUCT_DECISIONS.md` — *Owner Annotations vs Signer Fields*.

**Annotation color convention** — Amber (`#D97706` border, `#FFFBEB` bg) is reserved exclusively for owner annotations throughout the UI. Do not use amber for signer fields or other UI elements.

**UI:** shadcn/ui (style: base-nova) + Tailwind CSS 4. Path alias `@/` maps to the repo root.

**Form handling:** No form library. Inline `onChange` → `setState` pattern throughout.

**`use client` directive:** Required on all interactive pages and components that use hooks or browser APIs.

## Project Docs

Before implementing features or fixing bugs, check the `/docs` folder at the repo root:

- **`docs/PRODUCT_DECISIONS.md`** — UX and architectural decisions with rationale (e.g. signing request display model)
- **`docs/FEATURES.md`** — planned features with frontend implementation notes
- **`docs/BUGS.md`** — known bugs and their fix options

## Design System

### Color Theme — Blue (updated April 2026)
The app-wide theme uses a **blue/indigo palette** to match the marketing landing page (`app/page.tsx`).
All colors are defined as CSS custom properties in `app/globals.css` and consumed via `var(--*)` throughout the app.

| Token | Light value | Usage |
|-------|-------------|-------|
| `--primary` | `#2563EB` (blue-600) | Buttons, links, active states |
| `--primary-foreground` | `#FFFFFF` | Text on primary bg |
| `--background` | `#F8FAFC` (slate-50) | Page background |
| `--foreground` | `#0F172A` (slate-900) | Body text |
| `--card` | `#FFFFFF` | Card surfaces |
| `--muted` | `#E2E8F0` (slate-200) | Subtle backgrounds |
| `--muted-foreground` | `#475569` (slate-600) | Secondary text |
| `--border` | `#E2E8F0` | Borders & dividers |
| `--ring` | `#2563EB` | Focus rings |
| `--destructive` | `#DC2626` | Error/danger |

**Do not** reintroduce the old green (`#1B7F5B`) palette. Any new UI should use `var(--primary)` for the brand color.

### Marketing → App CTA flow
`app/page.tsx` hero has an inline email + "Start Free" form.
On submit it routes to `/login?email=<value>`.
`app/login/page.tsx` reads the `?email` param via `useSearchParams`, auto-switches to the **Register** tab, and pre-fills the email field. The inner component is wrapped in `<Suspense>` (required by Next.js for `useSearchParams` in App Router).

## Key Components

### `FieldPlacer.tsx`
Interactive PDF editor for placing both signer fields and owner annotations.
- **Exports:** `Field`, `Annotation`, `Signer` interfaces; `FIELD_TYPES`, `SIGNER_COLORS` constants
- **Props:** `fields`/`onFieldsChange` (signer fields) + `annotations`/`onAnnotationsChange` (owner text)
- **Tools:** 5 signer field types + `"annotation"` tool (places owner text boxes)
- **Drag/resize:** Two sets of refs — `movingRef`/`resizingRef` for signer fields, `movingAnnotationRef`/`resizingAnnotationRef` for annotations; both handled in a single global `useEffect` mouse handler
- **Inline editing:** `editingAnnotationId` state opens a `<textarea autoFocus>` on the placed annotation; `onBlur` closes it

### `PdfPreviewModal.tsx`
Read-only PDF viewer modal used on dashboard, templates, and documents pages.
- **Exports:** `PreviewField`, `PreviewAnnotation` interfaces
- **Props:** `previewFields?` (signer field overlays) + `previewAnnotations?` (annotation overlays)
- Annotations render below field overlays, both `pointer-events-none`

### `send/page.tsx`
Multi-step flow: document → fields → signers & send. Also handles template creation and editing.
- `annotations` state mirrors `fields` state; both are passed to `FieldPlacer` and included in all API calls
- Template edit (`mode=edit`) loads both fields and annotations from the existing template
- Bug fixed: template edit now calls `updateTemplate` instead of always calling `createTemplate`

### `sign/[token]/page.tsx`
Public signing page (no auth). Renders annotation overlays (`pointer-events-none`) then interactive signer field overlays on top.

## Known Issues

### PDF Download from Cloudinary (TODO)
**Status:** Download button in `PdfPreviewModal.tsx` is **commented out**.

**Root cause:** Browsers silently ignore the `<a download>` attribute for cross-origin URLs (Cloudinary CDN). Adding `fl_attachment` to the Cloudinary URL does set `Content-Disposition: attachment` but the file is served without a correct `Content-Type: application/pdf` header (because the Cloudinary resource is uploaded as `resource_type: raw`), so macOS/browsers open the bytes as a plain-text file.

**Fix options (pick one):**
1. **Backend proxy route** — Add `GET /api/documents/:id/download` that fetches the Cloudinary URL server-side, pipes the response with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=xxx.pdf` headers.
2. **Client-side Blob fetch** — In `PdfPreviewModal`, fetch the file with `fetch(url)`, create `new Blob([data], { type: 'application/pdf' })`, then `URL.createObjectURL` → `<a download>`. Works if Cloudinary CORS allows the origin (add `allowed_origins` in Cloudinary settings).
3. **Re-upload as `resource_type: image`** — Change `cloudinary.js` uploader to use `resource_type: 'auto'` (or `'image'`) so Cloudinary emits the correct MIME type. **Caution:** test that `pdfjs-dist` can still fetch the URL after this change.

The Download button code is preserved in a comment block in `components/PdfPreviewModal.tsx`.

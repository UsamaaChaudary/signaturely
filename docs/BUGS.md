# Known Bugs

Track active bugs, their root cause, and fix status here.

---

## Active

*(none currently)*

---

## Resolved

### PDF Download Broken from Cloudinary
**Status:** Resolved (Download button commented out as temporary workaround)
**Root cause:** Browsers ignore `<a download>` for cross-origin URLs. Cloudinary serves the file without `Content-Type: application/pdf` because it was uploaded as `resource_type: raw`.
**Fix options (pick one):**
1. Backend proxy route — `GET /api/documents/:id/download` fetches from Cloudinary server-side and pipes with correct headers.
2. Client-side Blob fetch — `fetch(url)` → `new Blob([...], { type: 'application/pdf' })` → `URL.createObjectURL`. Requires Cloudinary CORS to allow the origin.
3. Re-upload as `resource_type: auto` so Cloudinary emits correct MIME type.

**Location:** `frontend/components/PdfPreviewModal.tsx` (commented-out download button)

---

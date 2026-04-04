# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # Development with nodemon hot-reload
npm start       # Production start
```

No build step, lint, or test commands are configured. The app runs directly with Node.js (CommonJS).

## Architecture

Express.js REST API (port 4000) backed by MongoDB via Mongoose. All file storage is Cloudinary; there is no local file system storage.

```
src/
├── index.js          # App entry: Express setup, DB connection, route mounting
├── middleware/auth.js # JWT verification — populates req.user on protected routes
├── models/           # Mongoose schemas: User, Document, Contact, SigningRequest, Template
├── routes/           # One file per domain: auth, documents, requests, signing, contacts, templates
├── services/         # pdfService.js (PDF merge + Cloudinary upload), emailService.js (Resend/Ethereal)
└── utils/            # cloudinary.js (multer-cloudinary config), contactStats.js
```

**API prefix:** all routes mounted under `/api/*` except `/api/health`.

## Key Design Decisions

**Cloudinary URLs as file paths** — `Document.filePath` stores the full HTTPS Cloudinary URL (not a local path). Originals go to `signaturely/originals`, completed signed PDFs to `signaturely/completed`.

**Two-phase signing flow:**
1. Owner creates a `SigningRequest` with signers array (each signer gets a unique UUID token).
2. Signers access `/api/signing/:token` (no auth required) — this is the public endpoint.
3. When all signers complete, `pdfService` merges signatures into the PDF, re-uploads to Cloudinary, and triggers completion emails.

**Soft deletes** — Documents, contacts, requests, and templates use a `status` field rather than hard deletes.

**Email fallback** — If `RESEND_API_KEY` is absent, `emailService.js` falls back to Ethereal (dev test mailbox) automatically.

**Auth** — JWT via `Authorization: Bearer <token>`. The `auth` middleware in `middleware/auth.js` is applied per-router, not globally.

## Environment Variables

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/signo
JWT_SECRET=<secret>
FRONTEND_URL=http://localhost:3001       # Used to construct signing links in emails
RESEND_API_KEY=<key>                     # Omit to use Ethereal fallback in dev
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

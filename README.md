# Signo — Electronic Signature SaaS

A full-stack e-signature platform. Upload PDFs, place signature fields, send to signers, and receive a completed signed document by email.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express.js, Node.js (CommonJS) |
| Database | MongoDB via Mongoose |
| File Storage | Cloudinary |
| Email | Resend (falls back to Ethereal in dev) |
| Auth | JWT (30-day expiry, stored in localStorage) |

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** running locally on port `27017` (or a MongoDB Atlas connection string)
- A free **Cloudinary** account — [cloudinary.com](https://cloudinary.com)
- *(Optional)* A **Resend** account for real emails — [resend.com](https://resend.com). If omitted, emails go to an Ethereal test mailbox and are printed to the terminal.

---

## Project Structure

```
signaturely/
├── backend/    # Express.js REST API — port 4000
└── frontend/   # Next.js 16 App Router — port 3000
```

Each service has its own `package.json` and `node_modules`. They must be started in separate terminals.

---

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd signaturely
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (in a new terminal)
cd frontend && npm install
```

### 3. Configure environment variables

**Backend — create `backend/.env`:**

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/signo
JWT_SECRET=your_jwt_secret_here

# Used to build signing links sent in emails
FRONTEND_URL=http://localhost:3000

# Cloudinary (required for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional — omit to use Ethereal dev mailbox instead
RESEND_API_KEY=re_xxxxxxxxxxxx
```

**Frontend — create `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Start MongoDB

If running MongoDB locally:

```bash
mongod
```

Or update `MONGODB_URI` in `backend/.env` to point to your MongoDB Atlas cluster.

---

## Running Locally

Open two terminal windows and start each service independently.

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

Backend starts on [http://localhost:4000](http://localhost:4000). You should see:

```
MongoDB connected
Server running on port 4000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Frontend starts on [http://localhost:3000](http://localhost:3000).

---

## How It Works

1. **Register / Login** at `/register` or `/login`
2. **Upload a PDF** via the Documents page or the Send flow
3. **Place fields** — drag signature, text, and checkbox fields onto PDF pages
4. **Add signers** — assign signers by email with a signer slot per field
5. **Send** — each signer receives a unique email link (no account required to sign)
6. **Sign** — signers open their link, fill fields, and submit
7. **Completion** — once all signers complete, the signed PDF is emailed to all parties

---

## Available Scripts

### Backend (`/backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon hot-reload |
| `npm start` | Start in production mode |

### Frontend (`/frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |

---

## API

All backend routes are prefixed with `/api`. Health check: `GET /api/health`.

Public endpoint (no auth): `GET /api/signing/:token` — the signer's session.

All other endpoints require `Authorization: Bearer <jwt>` header.

---

## Notes

- There is no test suite. Testing is done by running both dev servers.
- Completed signed PDFs are stored in Cloudinary under `signaturely/completed/`.
- Original uploaded PDFs are stored under `signaturely/originals/`.
- All field coordinates (`x`, `y`, `width`, `height`) are stored as fractions (0.0–1.0) of page dimensions.

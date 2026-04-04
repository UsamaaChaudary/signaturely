# Homepage Redesign - Specification

**Date:** 2026-04-04
**Status:** Approved

## Overview

Redesign the Signo homepage to match a professional e-signature platform marketing site. Move the existing dashboard to `/dashboard`.

## Route Structure

- Marketing homepage: `/`
- Dashboard (existing): `/dashboard`
- Login: `/login`

## Visual Design

### Color Palette
- Primary: Indigo `#4f46e5` (refined from current)
- Background: White `#ffffff`
- Section backgrounds: Gray-50 `#f9fafb`
- Text: Gray-900 `#111827` (headings), Gray-600 `#4b5563` (body)
- Accent: Indigo for CTAs and highlights

### Typography
- Font: Inter (already configured)
- Headings: Bold, larger sizes
- Body: Regular weight, readable sizes

### Layout
- Max-width: 1280px (xl)
- Consistent padding: 80px vertical for sections
- Cards with soft shadows

---

## Page Sections

### 1. Navigation Header
- **Logo:** "Signo" with signature icon
- **Nav Links:** Features, Pricing, Use Cases, About
- **Right:** Login (link), Sign Up (primary button)
- **Behavior:** Sticky on scroll

### 2. Hero Section
- **Headline:** "Sign documents in seconds"
- **Subheadline:** "Simple, legally binding e-signatures. No complexity, just send and done."
- **Primary CTA:** "Start Free" (indigo bg, white text)
- **Secondary CTA:** "See How It Works" (outline)
- **Visual:** Placeholder for demo/screenshot on right side

### 3. Social Proof Section
- **Text:** "Trusted by 10,000+ businesses"
- **Stats:** "500K+ documents signed" | "98% satisfaction"
- **Background:** White with subtle border

### 4. Core Features (6 cards)
Cards in 3x2 grid, each with:
- Icon (Lucide)
- Title
- Description

**Features:**
1. E-Signature - "Legally binding signatures in clicks"
2. Document Templates - "Reusable contracts & agreements"
3. Real-Time Tracking - "Know exactly when someone signs"
4. Bank-Level Security - "256-bit encryption & compliance"
5. Mobile Ready - "Sign anywhere, any device"
6. Team Collaboration - "Multiple signers & workflows"

### 5. How It Works (3 steps)
Horizontal layout with numbered steps and connecting line:
1. **Upload** - "Upload your document in seconds"
2. **Add Fields** - "Drag and drop signature fields"
3. **Send & Track** - "Send for signature and track progress"

### 6. Use Cases (6 cards)
Cards in 3x2 grid:
1. Sales Contracts
2. HR & Onboarding
3. Real Estate
4. Legal Agreements
5. NDAs & Partnerships
6. Freelance Contracts

### 7. Final CTA Section
- **Headline:** "Ready to get started?"
- **Subheadline:** "Start signing documents today - No credit card required"
- **CTA:** "Start Free Trial" (primary button)

### 8. Footer
- **Logo:** "Signo"
- **Links:** Privacy Policy, Terms of Service, Contact
- **Copyright:** "© 2026 Signo. All rights reserved."

---

## Component Structure

```
app/
├── page.tsx              # Marketing homepage (NEW)
├── login/                # Login page (existing)
├── dashboard/
│   └── page.tsx          # Current dashboard (moved from app/page.tsx)
```

---

## Acceptance Criteria

1. Homepage loads at `/` with all 7 sections visible
2. Navigation is sticky and functional
3. CTAs are clickable and route correctly
4. All sections render without errors
5. Dashboard accessible at `/dashboard`
6. Login page at `/login` works as before
7. Mobile responsive (stacks on smaller screens)

"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  FileText,
  LayoutTemplate,
  Activity,
  Shield,
  Smartphone,
  Users,
  Check,
  PenLine,
  Send,
  ClipboardCheck,
  Menu,
  X,
} from "lucide-react";

/* ─── Palette ───────────────────────────────────────────────── */
const C = {
  primary:    "#2563EB",   // blue-600
  primaryDk:  "#1D4ED8",   // blue-700
  primaryLt:  "#EFF6FF",   // blue-50
  accent:     "#06B6D4",   // cyan-500
  dark:       "#0F172A",   // slate-900
  mid:        "#475569",   // slate-600
  light:      "#F8FAFC",   // slate-50
  border:     "#E2E8F0",   // slate-200
  white:      "#FFFFFF",
};

/* ─── Data ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FileSignature, title: "E-Signatures",         description: "Legally binding signatures accepted in all 50 states" },
  { icon: LayoutTemplate, title: "Smart Templates",     description: "Build once, reuse forever — for any contract type" },
  { icon: Activity,       title: "Real-Time Tracking",  description: "Instant notifications when documents are viewed or signed" },
  { icon: Shield,         title: "Bank-Level Security", description: "256-bit encryption, audit trails, and tamper detection" },
  { icon: Smartphone,     title: "Works Everywhere",    description: "Sign from any device — desktop, tablet, or mobile" },
  { icon: Users,          title: "Multi-Signer Flows",  description: "Route documents to multiple signers in any order" },
];

const STEPS = [
  { icon: FileText,       number: "01", title: "Upload",     description: "Drag in a PDF or pick from your document library" },
  { icon: PenLine,        number: "02", title: "Place Fields", description: "Click to drop signature, text, and date fields" },
  { icon: Send,           number: "03", title: "Send",        description: "Share via email — signers need zero account" },
  { icon: ClipboardCheck, number: "04", title: "Done",        description: "Completed PDF delivered to everyone automatically" },
];

/* ─── Shared email CTA ──────────────────────────────────────── */
function EmailCTA({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/login?email=${encodeURIComponent(email)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-0 w-full max-w-md">
      <div className="flex flex-1 items-center rounded-full border-2 pl-5 pr-1 py-1 bg-white shadow-sm" style={{ borderColor: C.border }}>
        <input
          id={id}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="flex-1 text-sm outline-none bg-transparent min-w-0"
          style={{ color: C.dark }}
        />
        <button
          type="submit"
          className="shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: C.primary }}
        >
          Start Free
        </button>
      </div>
    </form>
  );
}

/* ─── Navbar ────────────────────────────────────────────────── */
function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: C.border }}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.primary }}>
            <FileSignature className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: C.dark }}>Signo</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {[["#how-it-works", "How it works"], ["#features", "Features"], ["#use-cases", "Use Cases"]].map(([href, label]) => (
            <Link key={href} href={href} className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: C.mid }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: C.mid }}>
            Login
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold px-5 py-2 rounded-full text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: C.primary }}
          >
            Try for Free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg cursor-pointer"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" style={{ color: C.dark }} /> : <Menu className="h-5 w-5" style={{ color: C.dark }} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t px-6 py-4 space-y-3 bg-white" style={{ borderColor: C.border }}>
          {[["#how-it-works", "How it works"], ["#features", "Features"], ["#use-cases", "Use Cases"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block text-sm font-medium py-2" style={{ color: C.mid }}>
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t flex flex-col gap-2" style={{ borderColor: C.border }}>
            <Link href="/login" className="text-sm font-medium py-2 text-center rounded-lg border" style={{ color: C.mid, borderColor: C.border }}>Login</Link>
            <Link href="/login" className="text-sm font-semibold py-2 text-center rounded-full text-white" style={{ backgroundColor: C.primary }}>Try for Free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: C.white }}>
      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ backgroundColor: C.accent }} />
      <div className="absolute -bottom-16 -left-16 w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ backgroundColor: C.primary }} />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-6 border" style={{ backgroundColor: C.primaryLt, color: C.primary, borderColor: "#BFDBFE" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.primary }} />
              No credit card required
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight mb-6" style={{ color: C.dark }}>
              Get documents<br />signed in minutes
            </h1>

            <p className="text-lg leading-relaxed mb-8" style={{ color: C.mid }}>
              Upload any document, place signature fields, and send — your recipients sign instantly with no account needed.
            </p>

            <EmailCTA id="hero-email" />

            {/* Checklist */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5">
              {["Free forever plan", "Legally binding", "Works on any device"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm" style={{ color: C.mid }}>
                  <Check className="h-4 w-4 shrink-0" style={{ color: C.primary }} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right illustration */}
          <div className="hidden md:flex items-center justify-center relative">
            {/* Background card (behind) */}
            <div className="absolute right-0 top-4 w-64 h-80 rounded-2xl rotate-3 shadow-lg border" style={{ backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" }} />

            {/* Main document card */}
            <div className="relative z-10 w-72 rounded-2xl shadow-2xl p-6 border bg-white" style={{ borderColor: C.border }}>
              {/* Doc header */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: C.primary }}>
                  <FileSignature className="h-3 w-3 text-white" />
                </div>
                <span className="text-xs font-bold tracking-wide" style={{ color: C.dark }}>Signo</span>
              </div>

              {/* Doc lines */}
              <div className="space-y-2 mb-6">
                <div className="h-2.5 rounded-full w-3/4" style={{ backgroundColor: "#CBD5E1" }} />
                <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: "#E2E8F0" }} />
                <div className="h-2.5 rounded-full w-5/6" style={{ backgroundColor: "#E2E8F0" }} />
                <div className="h-2.5 rounded-full w-2/3" style={{ backgroundColor: "#E2E8F0" }} />
              </div>

              {/* Blue content area */}
              <div className="rounded-xl h-28 mb-6" style={{ backgroundColor: "#DBEAFE" }} />

              {/* Signature area */}
              <div className="rounded-xl border-2 border-dashed p-4 flex items-end justify-start" style={{ borderColor: "#93C5FD", backgroundColor: "#F0F9FF" }}>
                <svg viewBox="0 0 120 40" className="w-28 h-10" fill="none">
                  <path
                    d="M8 32 C20 8, 30 28, 40 18 C50 8, 55 30, 68 22 C80 14, 85 28, 100 20 C110 15, 115 24, 118 20"
                    stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
                  />
                </svg>
              </div>

              {/* Signed badge */}
              <div className="mt-3 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: "#16A34A" }} />
                <span className="text-xs font-medium" style={{ color: "#16A34A" }}>Signed & verified</span>
              </div>
            </div>

            {/* Floating pill */}
            <div className="absolute -bottom-2 -left-4 z-20 rounded-xl px-3 py-2 shadow-lg border bg-white flex items-center gap-2" style={{ borderColor: C.border }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: C.primary }}>3</div>
              <span className="text-xs font-medium" style={{ color: C.dark }}>signers completed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────── */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28" style={{ backgroundColor: C.white }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: C.primary }}>Simple process</p>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.dark }}>From upload to signed in 4 steps</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative rounded-2xl p-6 border hover:shadow-md transition-shadow" style={{ backgroundColor: C.light, borderColor: C.border }}>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-6 h-0.5 -translate-x-3 z-10" style={{ backgroundColor: C.border }} />
              )}
              <div className="text-3xl font-extrabold mb-4 leading-none" style={{ color: "#CBD5E1" }}>{step.number}</div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: C.primaryLt }}>
                <step.icon className="h-5 w-5" style={{ color: C.primary }} />
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: C.dark }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.mid }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────── */
function Features() {
  return (
    <section id="features" className="py-20 md:py-28" style={{ backgroundColor: C.light }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: C.primary }}>Built to scale</p>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.dark }}>Everything you need, nothing you don&apos;t</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl p-6 border bg-white hover:shadow-lg transition-all"
              style={{ borderColor: C.border }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:scale-105 duration-200" style={{ backgroundColor: C.primaryLt }}>
                <f.icon className="h-5 w-5" style={{ color: C.primary }} />
              </div>
              <h3 className="font-bold text-base mb-1.5" style={{ color: C.dark }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.mid }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Use Cases ─────────────────────────────────────────────── */
function UseCases() {
  const cases = [
    { emoji: "📋", title: "Sales Contracts",      desc: "Close deals faster with instant e-sign" },
    { emoji: "🧑‍💼", title: "HR & Onboarding",    desc: "Offer letters and NDAs signed day one" },
    { emoji: "🏠", title: "Real Estate",           desc: "Purchase agreements signed remotely" },
    { emoji: "⚖️", title: "Legal Agreements",      desc: "Binding contracts with full audit trail" },
    { emoji: "🤝", title: "NDAs & Partnerships",   desc: "Protect IP before every conversation" },
    { emoji: "💼", title: "Freelance Contracts",   desc: "Scope of work signed before you start" },
  ];

  return (
    <section id="use-cases" className="py-20 md:py-28" style={{ backgroundColor: C.white }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-sm font-bold tracking-widest uppercase mb-3" style={{ color: C.primary }}>Who uses Signo</p>
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.dark }}>Works for every industry</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl p-5 border hover:border-blue-300 hover:shadow-md transition-all cursor-default"
              style={{ backgroundColor: C.light, borderColor: C.border }}
            >
              <span className="text-3xl">{c.emoji}</span>
              <h3 className="font-bold mt-3 mb-1" style={{ color: C.dark }}>{c.title}</h3>
              <p className="text-sm" style={{ color: C.mid }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: C.primary }}>
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Start signing for free today
        </h2>
        <p className="text-blue-200 mb-8 text-lg">
          No credit card. No commitment. Just fast, legally binding signatures.
        </p>
        <div className="flex justify-center">
          <EmailCTA id="footer-email" />
        </div>
        <p className="text-blue-300 text-xs mt-4">
          Join 50,000+ businesses that trust Signo
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="py-10 border-t" style={{ backgroundColor: C.dark, borderColor: "#1E293B" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.primary }}>
              <FileSignature className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Signo</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#94A3B8" }}>
            {["Privacy Policy", "Terms of Service", "Contact"].map((l) => (
              <Link key={l} href="#" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-sm" style={{ color: "#64748B" }}>© 2026 Signo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <Hero />
      <HowItWorks />
      <Features />
      <UseCases />
      <FinalCTA />
      <Footer />
    </div>
  );
}

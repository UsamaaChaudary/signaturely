"use client";
import Link from "next/link";
import {
  FileSignature,
  FileText,
  LayoutTemplate,
  Activity,
  Shield,
  Smartphone,
  Users,
  ArrowRight,
  Check,
  Users2,
  Home,
  Scale,
  FileCheck,
  Briefcase,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FileSignature,
    title: "E-Signature",
    description: "Legally binding signatures in clicks",
  },
  {
    icon: LayoutTemplate,
    title: "Document Templates",
    description: "Reusable contracts & agreements",
  },
  {
    icon: Activity,
    title: "Real-Time Tracking",
    description: "Know exactly when someone signs",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "256-bit encryption & compliance",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Sign anywhere, any device",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Multiple signers & workflows",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Upload",
    description: "Upload your document in seconds",
  },
  {
    number: 2,
    title: "Add Fields",
    description: "Drag and drop signature fields",
  },
  {
    number: 3,
    title: "Send & Track",
    description: "Send for signature and track progress",
  },
];

const USE_CASES = [
  { icon: FileText, title: "Sales Contracts" },
  { icon: Users2, title: "HR & Onboarding" },
  { icon: Home, title: "Real Estate" },
  { icon: Scale, title: "Legal Agreements" },
  { icon: FileCheck, title: "NDAs & Partnerships" },
  { icon: Briefcase, title: "Freelance Contracts" },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CC' }}>
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileSignature className="h-7 w-7" style={{ color: '#1B7F5B' }} />
          <span className="font-bold text-xl" style={{ color: '#1A1A1A' }}>Signo</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
            Features
          </Link>
          <Link href="#pricing" className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
            Pricing
          </Link>
          <Link href="#use-cases" className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
            Use Cases
          </Link>
          <Link href="#about" className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium" style={{ color: '#6B6B6B' }}>
            Login
          </Link>
          <Link href="/login" style={{ backgroundColor: '#1B7F5B', color: '#FFFFFF', padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>
            Sign Up Free
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CC' }}>
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ color: '#1A1A1A' }}>
              Sign documents in seconds
            </h1>
            <p className="text-lg md:text-xl mt-6 leading-relaxed" style={{ color: '#6B6B6B' }}>
              Simple, legally binding e-signatures. No complexity, just send and done.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/login">
                <Button size="lg" style={{ backgroundColor: '#1B7F5B', color: '#FFFFFF' }}>
                  Start Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm" style={{ color: '#6B6B6B' }}>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" style={{ color: '#1B7F5B' }} />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" style={{ color: '#1B7F5B' }} />
                Free forever plan
              </span>
            </div>
          </div>

          <div className="hidden md:block rounded-2xl p-8 border" style={{ backgroundColor: '#E8E6DF', borderColor: '#D4D2CC' }}>
            <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#B22234' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F4D03F' }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1B7F5B' }} />
              </div>
              <div className="space-y-3">
                <div className="h-4 rounded w-3/4" style={{ backgroundColor: '#E8E6DF' }} />
                <div className="h-4 rounded w-1/2" style={{ backgroundColor: '#E8E6DF' }} />
                <div className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ backgroundColor: '#F5F4EE', borderColor: '#D4D2CC' }}>
                  <span className="text-sm" style={{ color: '#6B6B6B' }}>Document Preview</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 rounded w-24" style={{ backgroundColor: '#1B7F5B', opacity: 0.2 }} />
                  <div className="h-8 rounded w-24" style={{ backgroundColor: '#1B7F5B', opacity: 0.2 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="py-12 border-b" style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CC' }}>
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center font-medium mb-8" style={{ color: '#6B6B6B' }}>
          Trusted by 10,000+ businesses
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {["Acme Corp", "TechStart", "GlobalInc", "DataFlow", "CloudBase"].map((company) => (
            <span key={company} className="text-xl font-semibold" style={{ color: '#6B6B6B' }}>
              {company}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-8 md:gap-16 mt-10">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>500K+</div>
            <div className="text-sm" style={{ color: '#6B6B6B' }}>Documents Signed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>98%</div>
            <div className="text-sm" style={{ color: '#6B6B6B' }}>Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 md:py-28" style={{ backgroundColor: '#F5F4EE' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#1A1A1A' }}>
            Everything you need to sign documents
          </h2>
          <p className="text-lg mt-4" style={{ color: '#6B6B6B' }}>
            Powerful features that make document signing simple and secure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl p-6 border hover:shadow-lg transition-shadow"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CC' }}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#1B7F5B', opacity: 0.1 }}>
                <feature.icon className="h-6 w-6" style={{ color: '#1B7F5B' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>{feature.title}</h3>
              <p className="mt-2" style={{ color: '#6B6B6B' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#1A1A1A' }}>
            How it works
          </h2>
          <p className="text-lg mt-4" style={{ color: '#6B6B6B' }}>
            Get documents signed in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <div key={step.number} className="text-center relative">
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 -z-10" style={{ backgroundColor: '#D4D2CC' }} />
              )}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#1B7F5B' }}>
                <span className="text-2xl font-bold text-white">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>{step.title}</h3>
              <p className="mt-2" style={{ color: '#6B6B6B' }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="use-cases" className="py-20 md:py-28" style={{ backgroundColor: '#F5F4EE' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#1A1A1A' }}>
            Popular use cases
          </h2>
          <p className="text-lg mt-4" style={{ color: '#6B6B6B' }}>
            From sales contracts to legal agreements, Signo handles it all.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-xl p-6 border hover:shadow-lg transition-all cursor-pointer"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CC' }}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: '#F4D03F', opacity: 0.8 }}>
                <useCase.icon className="h-6 w-6" style={{ color: '#1A1A1A' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>{useCase.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#1A1A1A' }}>
          Ready to get started?
        </h2>
        <p className="text-lg mt-4 mb-8" style={{ color: '#6B6B6B' }}>
          Start signing documents today - No credit card required
        </p>
        <Link href="/login">
          <Button size="lg" style={{ backgroundColor: '#1B7F5B', color: '#FFFFFF' }}>
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSignature className="h-6 w-6" style={{ color: '#F5F4EE' }} />
            <span className="font-bold text-xl" style={{ color: '#F5F4EE' }}>Signo</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="#" style={{ color: '#6B6B6B' }}>
              Privacy Policy
            </Link>
            <Link href="#" style={{ color: '#6B6B6B' }}>
              Terms of Service
            </Link>
            <Link href="#" style={{ color: '#6B6B6B' }}>
              Contact
            </Link>
          </div>
          <div className="text-sm">
            © 2026 Signo. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F4EE' }}>
      <NavBar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <UseCases />
      <FinalCTA />
      <Footer />
    </div>
  );
}

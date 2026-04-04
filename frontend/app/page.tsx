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
  Building2,
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <FileSignature className="h-7 w-7 text-indigo-600" />
          <span className="font-bold text-xl text-gray-900">Signo</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Pricing
          </Link>
          <Link href="#use-cases" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Use Cases
          </Link>
          <Link href="#about" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Login
          </Link>
          <Link href="/login" className={buttonVariants({ className: "bg-indigo-600 hover:bg-indigo-700" })}>
            Sign Up Free
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Sign documents in seconds
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mt-6 leading-relaxed">
              Simple, legally binding e-signatures. No complexity, just send and done.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link href="/login">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
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
            <div className="flex items-center gap-6 mt-8 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Free forever plan
              </span>
            </div>
          </div>

          <div className="hidden md:block bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Document Preview</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-indigo-100 rounded w-24" />
                  <div className="h-8 bg-indigo-100 rounded w-24" />
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
    <section className="bg-white border-b border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-gray-500 font-medium mb-8">
          Trusted by 10,000+ businesses
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {["Acme Corp", "TechStart", "GlobalInc", "DataFlow", "CloudBase"].map((company) => (
            <span key={company} className="text-xl font-semibold text-gray-400">
              {company}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-8 md:gap-16 mt-10">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">500K+</div>
            <div className="text-sm text-gray-500">Documents Signed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">98%</div>
            <div className="text-sm text-gray-500">Customer Satisfaction</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="bg-gray-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Everything you need to sign documents
          </h2>
          <p className="text-lg text-gray-600 mt-4">
            Powerful features that make document signing simple and secure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="text-lg text-gray-600 mt-4">
            Get documents signed in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <div key={step.number} className="text-center relative">
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 -z-10" />
              )}
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">{step.number}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
              <p className="text-gray-600 mt-2">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="use-cases" className="bg-gray-50 py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Popular use cases
          </h2>
          <p className="text-lg text-gray-600 mt-4">
            From sales contracts to legal agreements, Signo handles it all.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <useCase.icon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{useCase.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Ready to get started?
        </h2>
        <p className="text-lg text-gray-600 mt-4 mb-8">
          Start signing documents today - No credit card required
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
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
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-white" />
            <span className="font-bold text-xl text-white">Signo</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
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
    <div className="min-h-screen bg-white">
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

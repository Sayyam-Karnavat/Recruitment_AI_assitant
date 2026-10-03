import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, ArrowLeft, ArrowRight, ShieldCheck, Cpu, Zap,
  CheckCircle2, Users, Building2, Lock, Eye, HeartHandshake,
  Globe2, Award, FileText, Mail
} from 'lucide-react'

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles size={16} />
            </div>
            <span className="font-extrabold tracking-tight">
              Upp<span className="text-blue-600">shot</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-all"
            >
              Recruiter Sign In <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
            <Sparkles size={13} />
            <span>About Uppshot — Precision Recruitment Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Transforming Modern Hiring with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">Explainable AI</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Uppshot is an enterprise-grade applicant screening and candidate ranking platform. We empower talent acquisition leaders, hiring managers, and fast-moving teams to evaluate resumes with human-level semantic comprehension, complete data privacy, and zero bias.
          </p>
        </section>

        {/* Mission & Problem Statement Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Zap size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">The Problem with Traditional ATS</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Legacy Applicant Tracking Systems rely on rigid keyword searches and boolean filters. Qualified candidates are routinely rejected simply because their resumes lacked exact buzzwords, while keyword-stuffed resumes bypass screening. Recruiters waste 70% of their time manually opening PDFs and comparing credentials.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 sm:p-8 rounded-2xl text-white shadow-md shadow-blue-500/15 space-y-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold backdrop-blur-sm">
              <Cpu size={20} />
            </div>
            <h2 className="text-lg font-bold">The Uppshot Semantic Advantage</h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Uppshot reads resumes like a seasoned senior recruiter. Our specialized LLM pipeline evaluates technical depth, relevant experience longevity, project impact, and job description alignment in under 3 seconds per candidate, delivering structured scorecards and actionable hiring insights.
            </p>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Our Core Engineering Pillars</h2>
            <p className="text-xs sm:text-sm text-slate-500">Built from the ground up for security, speed, and fairness.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-900">In-Memory Privacy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero disk footprint. Files stream exclusively in RAM during evaluation and are never retained on physical storage.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Anti-Cheat Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                OAuth authentication links every submission to a verified identity, preventing gaming and multiple altered resumes.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Eye size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Explainable Decisions</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every candidate rating includes explicit scoring criteria, identified strengths, skill gaps, and transparent rationales.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Instant Turnaround</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingest hundreds of resumes via nested ZIPs, Google Drive, or OneDrive. Process full batches in parallel in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* Company & Entity Information */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Identity & Governance</h2>
              <p className="text-xs text-slate-500">Operated by Artificial Grrow</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <p>
              Uppshot is developed and maintained by <strong>Artificial Grrow</strong> (<a href="https://www.artificial-grrow.online" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.artificial-grrow.online</a>), a specialized engineering lab dedicated to building autonomous AI intelligence systems for enterprise operations.
            </p>
            <p>
              Our infrastructure is hosted on ISO 27001-certified cloud infrastructure with 256-bit TLS encryption, strict data isolation per recruiter workspace, and full compliance with modern global data privacy standards.
            </p>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl shadow-blue-600/20 space-y-6">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to Upgrade Your Hiring Workflow?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Create your job posting in under 2 minutes. Share a verified application link and let AI shortlist top candidates automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-bold text-xs sm:text-sm hover:bg-blue-50 shadow-md transition-all"
            >
              Get Started with 10 Free Credits <ArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm border border-blue-400/40 transition-all"
            >
              Contact Enterprise Sales
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Uppshot</span>
            <span>— Precision AI Recruitment Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/about" className="hover:text-blue-600 transition-colors font-medium text-slate-700">About Us</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">Refund Policy</Link>
          </div>
          <div>© {new Date().getFullYear()} Uppshot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react'

export default function TermsOfService() {
  const lastUpdated = "September 26, 2026"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              R
            </div>
            <span>Resume<span className="text-blue-600">AI</span></span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-4">
          <FileText size={13} />
          <span>User Agreement & Conditions</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-500 mb-8">
          Last Updated: {lastUpdated}
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> 1. Acceptance of Terms
            </h2>
            <p>
              By signing into ResumeAI, purchasing screening credits, or accessing our developer APIs, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you have the authority to bind such entity to these terms.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" /> 2. Credit Wallet & Usage Rules
            </h2>
            <p>
              ResumeAI operates on a prepaid credit model:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Each credit authorizes the automated screening, structured parsing, and AI scoring of one candidate resume.</li>
              <li>Credits are deducted atomically upon initiation of batch processing or candidate submission.</li>
              <li>New accounts receive a one-time welcome bonus of 10 free credits upon verified email registration.</li>
              <li>Credits remain active for 365 days from the date of purchase.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> 3. Fair Use & Prohibited Conduct
            </h2>
            <p>Users and API integrators agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Upload malicious executables, decompressed zip bombs, or corrupted files designed to disrupt the platform.</li>
              <li>Engage in automated bot spamming or credential stuffing against public candidate application links.</li>
              <li>Configure custom webhook endpoints directing towards loopback addresses or internal cloud metadata addresses.</li>
              <li>Reverse-engineer prompt templates or proprietary evaluation algorithms.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" /> 4. AI Evaluation Disclaimer
            </h2>
            <p>
              ResumeAI delivers automated candidate ranking based on algorithmic semantic analysis against provided Job Descriptions. Our scores and recommendations serve as decision-support intelligence for human hiring teams; final hiring decisions, interviews, and background verifications remain the sole responsibility of the employer.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">5. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of India, and any disputes shall be subject to the exclusive jurisdiction of the courts located in Mumbai / Delhi, India.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

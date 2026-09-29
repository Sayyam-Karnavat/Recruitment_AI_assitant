import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, Lock, Eye, Server, RefreshCw } from 'lucide-react'

export default function PrivacyPolicy() {
  const lastUpdated = "September 26, 2026"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              U
            </div>
            <span>Upp<span className="text-blue-600">shot</span></span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-4">
          <Shield size={13} />
          <span>Data Privacy & Security Standard</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 mb-8">
          Last Updated: {lastUpdated}
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" /> 1. Overview & Information We Collect
            </h2>
            <p>
              Uppshot ("we", "our", or "us") provides AI-powered resume screening, applicant evaluation, and candidate ranking solutions for employers and hiring teams. This Privacy Policy outlines how we collect, process, and safeguard personal data when recruiters and job applicants use our platform.
            </p>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Recruiter Account Information:</strong> Email address, name, authentication tokens via Google OAuth, and credit transaction ledgers.</li>
              <li><strong>Candidate Application Data:</strong> Name, email address, telephone number, employment history, education, skills, and resume files (PDF, DOCX) uploaded by applicants or recruiters.</li>
              <li><strong>System Telemetry & Billing:</strong> IP addresses, payment transaction reference IDs generated via Razorpay, and API usage statistics.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" /> 2. AI Processing & LLM Data Protection
            </h2>
            <p>
              Resume evaluations are processed via dedicated enterprise Azure OpenAI / OpenAI endpoints:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Zero Model Training:</strong> Neither resume contents nor applicant personal information are ever used to train or fine-tune public foundation AI models.</li>
              <li><strong>In-Memory Processing:</strong> Text extracted from uploaded resumes is analyzed dynamically in transient memory for scoring against job specifications.</li>
              <li><strong>Confidentiality:</strong> All API communications between our services and LLM inference clusters are encrypted using TLS 1.3.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" /> 3. Payment & Financial Data
            </h2>
            <p>
              Uppshot does not store debit card numbers, credit card CVVs, or net banking passwords. All billing and wallet top-ups are processed directly by our RBI-licensed payment gateway partner, <strong>Razorpay Software Private Limited</strong>. Payment records stored on our servers are limited to transaction identifiers, credit amounts, and timestamp audit logs.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" /> 4. Data Retention & Candidate Rights
            </h2>
            <p>
              Recruiters retain full ownership and control over candidate data submitted to their jobs. Recruiters may delete candidate evaluation records or job postings at any time directly through the recruiter dashboard, which permanently cascades deletion across all candidate profiles, scores, and categorical feedback.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">5. Contact Information</h2>
            <p>
              For privacy inquiries, data deletion requests, or questions regarding this policy, please reach out to our Data Protection Officer at:
              <br />
              <strong>Email:</strong> support@uppshot.com / sanyam.karnavat5@gmail.com
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

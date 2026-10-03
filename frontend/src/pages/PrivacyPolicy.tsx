import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft, Lock, Eye, Server, RefreshCw, Sparkles } from 'lucide-react'

export default function PrivacyPolicy() {
  const lastUpdated = "September 26, 2026"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:opacity-85 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles size={16} />
            </div>
            <span className="font-extrabold tracking-tight">
              Upp<span className="text-blue-600">shot</span>
            </span>
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
              Uppshot ("we", "our", or "us"), operated by Artificial Grrow (https://www.artificial-grrow.online) and hosted at https://uppshot.com, provides AI-powered resume screening, applicant evaluation, and candidate ranking solutions for employers and hiring teams. This Privacy Policy outlines how we collect, process, and safeguard personal data when recruiters and job applicants use our platform.
            </p>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Recruiter Account Information:</strong> Email address, name, authentication tokens via Google OAuth or GitHub OAuth, and credit transaction ledgers.</li>
              <li><strong>Candidate Application Data:</strong> Name, email address, telephone number, employment history, education, skills, and resume files (PDF, DOCX) uploaded by applicants or recruiters.</li>
              <li><strong>System Telemetry & Billing:</strong> IP addresses, payment transaction reference IDs generated via Razorpay, and API usage statistics.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-blue-200/80 shadow-xs space-y-3 bg-gradient-to-br from-white to-blue-50/20">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" /> 2. Google API Services & Limited Use Disclosure
            </h2>
            <p className="font-medium text-slate-800">
              Uppshot's use and transfer of information received from Google APIs to any other app will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline font-semibold hover:text-blue-700"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li><strong>Google Sign-In:</strong> Used solely to authenticate recruiter and applicant identity via email and name.</li>
              <li><strong>Google Drive Integration (Google Picker):</strong> Uses the scoped <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">drive.file</code> permission exclusively to download resume documents that you manually pick. We never scan, browse, or access any other files in your Google Drive.</li>
              <li><strong>No Data Resale or Advertising:</strong> Google user data is never transferred, shared, or sold to third parties, external brokers, or advertising networks.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" /> 3. AI Processing & LLM Data Protection
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
              <Lock className="w-4 h-4 text-blue-600" /> 4. Payment & Financial Data
            </h2>
            <p>
              Uppshot does not store debit card numbers, credit card CVVs, or net banking passwords. All billing and wallet top-ups are processed directly by our RBI-licensed payment gateway partner, <strong>Razorpay Software Private Limited</strong>. Payment records stored on our servers are limited to transaction identifiers, credit amounts, and timestamp audit logs.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" /> 5. Data Retention & Candidate Rights
            </h2>
            <p>
              Recruiters retain full ownership and control over candidate data submitted to their jobs. Recruiters may delete candidate evaluation records or job postings at any time directly through the recruiter dashboard, which permanently cascades deletion across all candidate profiles, scores, and categorical feedback.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">6. Contact Information</h2>
            <p>
              For privacy inquiries, data deletion requests, or questions regarding this policy, please reach out to our Data Protection Officer at:
              <br />
              <strong>Email:</strong> support@uppshot.com / sanyam.karnavat5@gmail.com
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Uppshot</span>
            <span>— Precision AI Recruitment Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors font-semibold text-blue-600">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">Refund Policy</Link>
          </div>
          <div>© {new Date().getFullYear()} Uppshot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

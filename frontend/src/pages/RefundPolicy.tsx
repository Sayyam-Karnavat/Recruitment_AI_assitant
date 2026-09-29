import React from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, ArrowLeft, CheckCircle2, Clock, HelpCircle } from 'lucide-react'

export default function RefundPolicy() {
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
          <RotateCcw size={13} />
          <span>Billing Transparency</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Cancellation & Refund Policy
        </h1>
        <p className="text-xs text-slate-500 mb-8">
          Last Updated: {lastUpdated}
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Unused Credits Refund Guarantee
            </h2>
            <p>
              We stand behind the quality and precision of Uppshot. If you purchase any credit package and find that the platform does not meet your hiring workflow requirements, you are eligible for a <strong>pro-rated refund on all completely unconsumed credits within 7 days</strong> of your payment date.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> 2. Consumed Credits Policy
            </h2>
            <p>
              Because automated AI resume screening immediately incurs irreversible third-party GPU and LLM computing costs upon execution, credits that have already been utilized to parse, score, and rank candidate resumes cannot be refunded.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600" /> 3. System Fault Credit Restorations
            </h2>
            <p>
              If a resume fails processing due to an internal system fault (e.g. OpenAI service interruption or database timeout), your wallet credit is <strong>automatically reimbursed to your balance</strong> at zero charge.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" /> 4. How to Request a Refund
            </h2>
            <p>
              To initiate a refund for unconsumed wallet credits, simply email our billing team at <strong>support@uppshot.com</strong> or <strong>sanyam.karnavat5@gmail.com</strong> with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Your registered account email address</li>
              <li>Razorpay Payment ID (e.g. <code>pay_xxxxxx</code>) from your wallet receipt</li>
              <li>A brief sentence describing your reason for cancellation</li>
            </ul>
            <p>
              Approved refunds are credited back to your original payment method (UPI, NetBanking, or Credit/Debit Card) within <strong>5 to 7 business days</strong> as per banking network standards.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

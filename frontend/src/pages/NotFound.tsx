import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Home, ArrowLeft, Search, HelpCircle, Briefcase, Mail } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

export default function NotFound() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '404 — Page Not Found | Uppshot'
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-100/50 via-sky-50/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 hover:opacity-85 transition-opacity">
            <BrandLogo className="w-8 h-8" />
            <span className="font-extrabold tracking-tight">
              Upp<span className="text-blue-600">shot</span>
            </span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>
      </header>

      {/* Main 404 Visual & Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-8">
        <div className="max-w-lg w-full text-center space-y-6 bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-200/50">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-50 to-sky-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
              <Search size={40} className="stroke-[1.5]" />
            </div>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono font-bold text-xs shadow-md">
              404
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              We couldn't find the page you're looking for. The link may be broken, outdated, or the position may have closed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <Home size={15} /> Return to Home
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs transition-all"
            >
              <Briefcase size={15} /> Go to Dashboard
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
            <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Mail size={12} /> Contact Support
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-6 text-xs text-slate-500 text-center">
        <div className="max-w-6xl mx-auto px-4">
          © {new Date().getFullYear()} Uppshot. Precision AI Recruitment Intelligence. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

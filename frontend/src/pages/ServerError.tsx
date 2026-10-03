import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, Home, AlertTriangle, Mail } from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

interface ServerErrorProps {
  error?: Error | null
  resetError?: () => void
}

export default function ServerError({ error, resetError }: ServerErrorProps) {
  useEffect(() => {
    document.title = '500 — Temporary Server Error | Uppshot'
  }, [])

  const handleReload = () => {
    if (resetError) {
      resetError()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-rose-100 selection:text-rose-900 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-rose-100/40 via-amber-50/30 to-transparent rounded-full blur-3xl" />
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
          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <Mail size={14} /> Contact Support
          </Link>
        </div>
      </header>

      {/* Main 500 Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-8">
        <div className="max-w-lg w-full text-center space-y-6 bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-200/50">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-50 to-amber-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-inner">
              <AlertTriangle size={40} className="stroke-[1.5]" />
            </div>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold text-xs shadow-md">
              500
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Unexpected System Error
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              Our servers encountered a temporary issue while loading this resource. Your account balance and saved candidate data are completely safe.
            </p>
          </div>

          {error && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left overflow-x-auto max-h-32 text-xs font-mono text-slate-600">
              <span className="text-rose-600 font-bold">Error:</span> {error.message || String(error)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReload}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
            >
              <RefreshCw size={15} /> Reload Application
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs transition-all"
            >
              <Home size={15} /> Return to Home
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-500">
            <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Mail size={12} /> Support Helpdesk
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-6 text-xs text-slate-500 text-center">
        <div className="max-w-6xl mx-auto px-4">
          © {new Date().getFullYear()} Uppshot. Precision AI Recruitment Intelligence.
        </div>
      </footer>
    </div>
  )
}

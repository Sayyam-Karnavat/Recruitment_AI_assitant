import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'
import { Sparkles, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'

export default function Login() {
  const { loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async (credential: string) => {
    setLoading(true)
    setError('')
    try {
      await loginWithGoogle(credential)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50 text-slate-900 font-sans">
      {/* Left panel — Product Value & Executive Preview */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Sparkles size={18} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            Resume<span className="text-blue-400">AI</span>
          </span>
        </div>

        {/* Center: Live Candidate Score Card Demonstration */}
        <div className="relative z-10 max-w-md w-full mx-auto my-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/20">
                Top Recommendation #1
              </span>
              <span className="text-2xl font-black text-emerald-400">96/100</span>
            </div>

            <div className="mt-4">
              <h4 className="font-bold text-base text-white">Senior Full-Stack Architect</h4>
              <p className="text-xs text-slate-300 mt-0.5">Evaluated across 7 semantic dimensions</p>
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                { label: 'Technical Depth', score: '9.8/10', pct: '98%' },
                { label: 'Chronological Work History', score: '9.5/10', pct: '95%' },
                { label: 'System Architecture', score: '9.2/10', pct: '92%' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300 font-medium">
                    <span>{item.label}</span>
                    <span className="font-mono text-blue-300">{item.score}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full" style={{ width: item.pct }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 size={14} /> Ready for Interview
              </span>
              <span className="font-mono text-slate-400">Time: 2.4s</span>
            </div>
          </div>
        </div>

        {/* Bottom Highlights */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <ShieldCheck size={16} className="text-blue-400" />
            <span>Zero-Disk Memory Streaming · GDPR & ATS Compliant</span>
          </div>
          <p className="text-xs text-slate-400">
            Screen 1,000+ candidates in minutes with deterministic date resolution and custom prompt criteria.
          </p>
        </div>
      </div>

      {/* Right panel — Auth Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 max-w-lg mx-auto w-full">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center gap-2 mb-8 self-start">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-bold text-lg text-slate-900">
            Resume<span className="text-blue-600">AI</span>
          </span>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-100">
          {/* Welcome Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-4">
            <Sparkles size={13} />
            <span>50 Free Welcome Credits on Sign In</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
            Sign In to ResumeAI
          </h1>
          <p className="text-sm text-slate-600 mb-8">
            Access your recruiter studio, manage active jobs, and review AI rankings.
          </p>

          {/* Error alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Google Sign In */}
          <div className="w-full flex justify-center py-2">
            <GoogleLogin
              onSuccess={(c) => c.credential && handleGoogle(c.credential)}
              onError={() => setError('Google sign-in was cancelled.')}
              theme="outline"
              shape="rectangular"
              size="large"
              width="100%"
            />
          </div>

          {loading && (
            <p className="text-center text-xs font-semibold text-blue-600 mt-4 animate-pulse">
              Authenticating workspace...
            </p>
          )}

          {/* Guarantee / Perks */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-blue-600" />
              <span>Instant access to LinkedIn shareable career links</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-blue-600" />
              <span>Bulk PDF, DOCX & nested ZIP extraction</span>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}

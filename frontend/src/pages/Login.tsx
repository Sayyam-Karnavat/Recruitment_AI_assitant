import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let res
      if (isSignUp) {
        res = await api.post('/auth/register', { name, email, password })
      } else {
        res = await api.post('/auth/login', { email, password })
      }
      login(res.data.access_token, res.data.user)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async (credential: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/google', { token: credential })
      login(res.data.access_token, res.data.user)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'stretch',
      background: 'var(--c-base)', position: 'relative',
    }}>
      {/* Left panel — decorative */}
      <div
        aria-hidden="true"
        style={{
          flex: 1, display: 'none',
          background: 'var(--c-surface)',
          borderRight: '1px solid var(--c-border)',
          position: 'relative', overflow: 'hidden',
          flexDirection: 'column', alignItems: 'flex-start',
          justifyContent: 'flex-end', padding: 48,
        }}
        className="lg:flex"
      >
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(91,95,237,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(91,95,237,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }} />
        {/* Gradient orb */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '60%', paddingTop: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,95,237,0.18) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }} />

        {/* Score card preview */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -55%)',
          background: 'var(--c-elevated)',
          border: '1px solid var(--c-border-hi)',
          borderRadius: 16, padding: '24px 28px',
          width: '70%', maxWidth: 280,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--c-t3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
            Top Match
          </div>
          <div style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: '0.9375rem', marginBottom: 4 }}>Sanyam K.</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--c-t2)', marginBottom: 18 }}>Senior AI Engineer</div>
          {[['Experience', 9], ['Skills', 8], ['Projects', 9], ['Education', 8]].map(([cat, score]) => (
            <div key={String(cat)} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
                <span style={{ color: 'var(--c-t2)' }}>{cat}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--c-copper)', fontWeight: 600 }}>{score}/10</span>
              </div>
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${Number(score) * 10}%`, background: 'var(--c-brand)' }} />
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span className="badge badge-strong">Strong Shortlist</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '1.75rem', fontWeight: 700, color: 'var(--c-copper)', letterSpacing: '-0.04em' }}>92</span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--c-t3)', lineHeight: 1.6, maxWidth: 260 }}>
            AI-ranked candidate shortlists in minutes — not spreadsheets full of guesswork.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, alignSelf: 'flex-start' }}>
          <span style={{
            width: 32, height: 32, background: 'var(--c-brand)', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5.5 6.5h7M5.5 9h7M5.5 11.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--c-t1)' }}>ResumeAI</span>
        </div>

        <div className="fade-up" style={{ width: '100%' }}>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--c-t1)', marginBottom: 6 }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-t2)', marginBottom: 28 }}>
            {isSignUp ? 'Start screening smarter today.' : 'Sign in to your ResumeAI workspace.'}
          </p>

          {/* Error */}
          {error && (
            <div role="alert" className="alert-error" style={{ marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isSignUp && (
              <div>
                <label htmlFor="name" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required={isSignUp}
                  autoComplete="name"
                  autoFocus={isSignUp}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus={!isSignUp}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 4, padding: '0.6875rem 1rem', width: '100%' }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <ArrowRight size={16} aria-hidden="true" />
              }
              {loading ? 'Signing in…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <div className="divider" />
            <span style={{ fontSize: '0.75rem', color: 'var(--c-t3)', whiteSpace: 'nowrap' }}>or continue with</span>
            <div className="divider" />
          </div>

          {/* Google */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={c => c.credential && handleGoogle(c.credential)}
              onError={() => setError('Google sign-in was cancelled.')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="360"
            />
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--c-t3)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => { setIsSignUp(s => !s); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-brand-hi)', fontWeight: 600, fontSize: 'inherit' }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

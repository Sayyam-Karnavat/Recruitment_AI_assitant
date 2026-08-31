import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

// Animated counter — Apple: "take a small input, make a big output"
function AnimatedCounter({ target, duration = 1400 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef<number>()

  useEffect(() => {
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return <>{value}</>
}

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 3h9l4 4v10H4V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M13 3v4h4M6.5 9h7M6.5 12h7M6.5 15h4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    ),
    accent: '#7B7FF5',
    bg: 'rgba(91,95,237,0.10)',
    title: 'Bulk Upload',
    desc: 'Drop 100+ resumes at once — PDF, DOCX, or ZIP. Processing starts the instant files land.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    accent: '#34C759',
    bg: 'rgba(52,199,89,0.10)',
    title: 'Instant Scoring',
    desc: 'AI evaluates every resume across 7 dimensions in seconds — not hours.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 15l4-6 4 3 3-5 3 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="2.5" y="2.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    accent: '#FF9F0A',
    bg: 'rgba(255,159,10,0.10)',
    title: 'Ranked Results',
    desc: 'Candidates sorted by fit score with per-category rationale. No black box, no guessing.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 6.5v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    accent: '#5B5FED',
    bg: 'rgba(91,95,237,0.10)',
    title: 'Real-time Progress',
    desc: 'Live batch tracking — watch each resume process with a status feed as it happens.',
  },
]

const stats = [
  { value: 100, suffix: '+', label: 'Resumes per batch' },
  { value: 7, suffix: '', label: 'Scoring dimensions' },
  { value: 10, suffix: '×', label: 'Faster than manual' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--c-base)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Mesh gradient background ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Large violet orb — top center */}
        <div style={{
          position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
          width: '70vw', height: '60vw', maxWidth: 800, maxHeight: 700,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(91,95,237,0.15) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }} />
        {/* Copper orb — bottom right */}
        <div style={{
          position: 'absolute', bottom: '5%', right: '-10%',
          width: '40vw', height: '40vw', maxWidth: 500,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(201,135,58,0.10) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }} />
        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(91,95,237,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(91,95,237,0.025) 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', maxWidth: 1100, margin: '0 auto', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 34, height: 34,
            background: 'var(--c-brand)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M5.5 6.5h7M5.5 9h7M5.5 11.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.025em', color: 'var(--c-t1)' }}>
            ResumeAI
          </span>
        </div>

        <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main style={{
        position: 'relative', zIndex: 10,
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        padding: '40px 24px 60px',
        maxWidth: 900, margin: '0 auto', width: '100%',
      }}>
        {/* Pill label */}
        <div className="fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(91,95,237,0.1)',
          border: '1px solid rgba(91,95,237,0.22)',
          borderRadius: 99,
          padding: '5px 14px',
          marginBottom: 28,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--c-brand-hi)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-brand-hi)', boxShadow: '0 0 8px var(--c-brand)' }} />
          AI-Powered Recruitment Intelligence
        </div>

        {/* Headline */}
        <h1 className="fade-up delay-50" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.25rem)',
          fontWeight: 800,
          lineHeight: 1.04,
          letterSpacing: '-0.04em',
          color: 'var(--c-t1)',
          marginBottom: 22,
          maxWidth: '18ch',
        }}>
          Screen resumes in{' '}
          <span className="gradient-text">minutes,</span>
          {' '}not days.
        </h1>

        <p className="fade-up delay-100" style={{
          fontSize: '1.0625rem',
          lineHeight: 1.65,
          color: 'var(--c-t2)',
          maxWidth: 480,
          marginBottom: 36,
          fontWeight: 400,
        }}>
          Upload your job description and candidate resumes. Our AI reads,
          scores, and ranks every applicant with per-category reasoning you can trust.
        </p>

        <div className="fade-up delay-150" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}>
            Start Screening Free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h10M7.5 2.5 12 7l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        {/* Signature element: live score counter */}
        <div className="fade-up delay-200" style={{
          marginTop: 56,
          padding: '24px 40px',
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border-hi)',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 48,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {stats.map(({ value, suffix, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: 'tabular-nums',
                fontSize: '2.25rem',
                fontWeight: 700,
                color: 'var(--c-copper)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}>
                <AnimatedCounter target={value} />
                {suffix}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-t3)', marginTop: 6, fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginTop: 52,
          width: '100%',
          maxWidth: 860,
        }}>
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card fade-up"
              style={{
                padding: '20px',
                textAlign: 'left',
                animationDelay: `${220 + i * 60}ms`,
              }}
            >
              <div style={{
                width: 38, height: 38,
                background: f.bg,
                color: f.accent,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--c-t1)', marginBottom: 6 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--c-t2)', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', padding: '20px',
        fontSize: '0.75rem', color: 'var(--c-t3)',
        borderTop: '1px solid var(--c-border)',
      }}>
        © {new Date().getFullYear()} ResumeAI. Built for HR teams who value their time.
      </footer>
    </div>
  )
}

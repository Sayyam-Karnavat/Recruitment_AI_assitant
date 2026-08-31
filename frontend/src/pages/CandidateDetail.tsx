import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { ChevronLeft, Loader2, Mail, Phone, MapPin, Briefcase } from 'lucide-react'

interface CategoryScore {
  category: string
  score: number
  rationale: string | null
}

interface CandidateData {
  id: string
  filename: string
  status: string
  raw_text: string | null
  created_at: string
  profile: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    current_role: string | null
    total_experience_years: number
    skills: string[] | null
    work_experience: any[] | null
    education: any[] | null
    projects: any[] | null
    certifications: string[] | null
    achievements: string[] | null
  } | null
  evaluation: {
    overall_score: number
    recommendation: string
    summary: string | null
    strengths: string[] | null
    weaknesses: string[] | null
    missing_skills: string[] | null
    categories: CategoryScore[]
  } | null
}

function ScoreRing({ score }: { score: number }) {
  const radius = 42
  const circ = 2 * Math.PI * radius
  const fill = (score / 100) * circ
  const color = score >= 75 ? 'var(--c-green)' : score >= 50 ? 'var(--c-orange)' : 'var(--c-red)'

  return (
    <svg width="112" height="112" viewBox="0 0 112 112" aria-label={`Score: ${score} out of 100`} role="img" style={{ flexShrink: 0 }}>
      <circle cx="56" cy="56" r={radius} fill="none" stroke="var(--c-overlay)" strokeWidth="6" />
      <circle
        cx="56" cy="56" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{
          transition: 'stroke-dasharray 1s var(--ease-spring-bounce)',
          filter: `drop-shadow(0 0 8px ${color}66)`,
        }}
      />
      <text x="56" y="52" textAnchor="middle" dominantBaseline="middle"
        fontFamily="'JetBrains Mono', monospace" fontSize="22" fontWeight="700" fill="var(--c-t1)">
        {score}
      </text>
      <text x="56" y="70" textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inter', sans-serif" fontSize="10" fill="var(--c-t3)" fontWeight="500" letterSpacing="0.05em">
        /100
      </text>
    </svg>
  )
}

function getRecommendationClass(rec: string) {
  switch (rec) {
    case 'Strong Shortlist': return 'badge badge-strong'
    case 'Shortlist': return 'badge badge-shortlist'
    case 'Maybe': return 'badge badge-maybe'
    default: return 'badge badge-reject'
  }
}

function getBarColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.75) return 'var(--c-green)'
  if (pct >= 0.5) return 'var(--c-orange)'
  return 'var(--c-red)'
}

export default function CandidateDetail() {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>()
  const [data, setData] = useState<CandidateData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/candidates/${candidateId}`)
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [candidateId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={24} color="var(--c-brand)" />
      </div>
    )
  }

  if (!data) return (
    <p style={{ fontSize: '0.875rem', color: 'var(--c-t3)', textAlign: 'center', marginTop: 80 }}>Candidate not found.</p>
  )

  const { profile, evaluation } = data

  return (
    <div style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Back */}
      <div className="fade-up">
        <Link to={`/jobs/${jobId}`} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Candidates
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
      }}>
        {/* Left: Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Basic info */}
          <div className="card fade-up" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--c-t1)', letterSpacing: '-0.02em' }}>
              {profile?.name || data.filename}
            </h2>
            {profile?.current_role && (
              <p style={{ fontSize: '0.9375rem', color: 'var(--c-t2)', margin: '0 0 20px 0' }}>{profile.current_role}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem', color: 'var(--c-t2)' }}>
              {profile?.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Mail size={14} color="var(--c-t3)" aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</span>
                </div>
              )}
              {profile?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Phone size={14} color="var(--c-t3)" aria-hidden="true" style={{ flexShrink: 0 }} />
                  {profile.phone}
                </div>
              )}
              {profile?.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MapPin size={14} color="var(--c-t3)" aria-hidden="true" style={{ flexShrink: 0 }} />
                  {profile.location}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Briefcase size={14} color="var(--c-t3)" aria-hidden="true" style={{ flexShrink: 0 }} />
                <span><span className="mono">{profile?.total_experience_years ?? 0}</span>&nbsp;yrs experience</span>
              </div>
            </div>
          </div>

          {/* Skills */}
          {profile?.skills && profile.skills.length > 0 && (
            <div className="card fade-up delay-50" style={{ padding: 28 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-t3)', marginBottom: 16, marginTop: 0 }}>
                Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {profile.skills.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 99,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--c-t2)',
                      border: '1px solid var(--c-border)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile?.certifications && profile.certifications.length > 0 && (
            <div className="card fade-up delay-100" style={{ padding: 28 }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-t3)', marginBottom: 16, marginTop: 0 }}>
                Certifications
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--c-t2)' }}>
                {profile.certifications.map((c, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--c-green)', marginTop: -1 }} aria-hidden="true">✓</span>
                    <span style={{ lineHeight: 1.5 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Evaluation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, gridColumn: 'span 2' }}>
          {evaluation ? (
            <>
              {/* Score header */}
              <div className="card fade-up" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                  <ScoreRing score={evaluation.overall_score} />
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <span className={getRecommendationClass(evaluation.recommendation)}>
                      {evaluation.recommendation}
                    </span>
                    {evaluation.summary && (
                      <p style={{
                        fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--c-t2)',
                        margin: '16px 0 0 0', maxWidth: '56ch',
                      }}>
                        {evaluation.summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Category scores */}
              <div className="card fade-up delay-50" style={{ padding: 28 }}>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-t3)', marginBottom: 24, marginTop: 0 }}>
                  Category Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {evaluation.categories.map((cat) => (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 8 }}>
                        <span style={{ fontWeight: 500, color: 'var(--c-t2)' }}>{cat.category}</span>
                        <span className="mono" style={{ color: 'var(--c-t3)' }}>{cat.score}/10</span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${cat.score * 10}%`, background: getBarColor(cat.score, 10) }}
                          role="progressbar"
                          aria-valuenow={cat.score}
                          aria-valuemin={0}
                          aria-valuemax={10}
                          aria-label={`${cat.category}: ${cat.score} out of 10`}
                        />
                      </div>
                      {cat.rationale && (
                        <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, color: 'var(--c-t3)', margin: '8px 0 0 0' }}>
                          {cat.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }} className="fade-up delay-100">
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="card" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-green)', marginBottom: 16, marginTop: 0 }}>
                      Strengths
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem', color: 'var(--c-t2)' }}>
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--c-green)', marginTop: -1 }} aria-hidden="true">✓</span>
                          <span style={{ lineHeight: 1.5 }}>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                  <div className="card" style={{ padding: 28 }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-red)', marginBottom: 16, marginTop: 0 }}>
                      Weaknesses
                    </h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem', color: 'var(--c-t2)' }}>
                      {evaluation.weaknesses.map((w, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--c-red)', marginTop: -1 }} aria-hidden="true">✗</span>
                          <span style={{ lineHeight: 1.5 }}>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Missing skills */}
              {evaluation.missing_skills && evaluation.missing_skills.length > 0 && (
                <div className="card fade-up delay-150" style={{ padding: 28 }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--c-t3)', marginBottom: 16, marginTop: 0 }}>
                    Missing Skills
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {evaluation.missing_skills.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 99,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          background: 'var(--c-red-dim)',
                          color: 'var(--c-red)',
                          border: '1px solid rgba(255,55,95,0.2)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card fade-up" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9375rem', color: 'var(--c-t2)', margin: '0 0 6px 0' }}>Evaluation not available yet.</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--c-t3)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status: {data.status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

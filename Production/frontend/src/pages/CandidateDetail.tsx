import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { ArrowLeft, Loader2, User, Mail, Phone, MapPin, Briefcase } from 'lucide-react'

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
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  if (!data) return <p className="text-slate-500">Candidate not found.</p>

  const { profile, evaluation } = data

  const getScoreBarColor = (score: number, max: number) => {
    const pct = score / max
    if (pct >= 0.75) return 'bg-green-500'
    if (pct >= 0.5) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <Link to={`/jobs/${jobId}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Candidates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">{profile?.name || data.filename}</h2>
            <div className="space-y-2 text-sm text-slate-600">
              {profile?.current_role && (
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /> {profile.current_role}</div>
              )}
              {profile?.email && (
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {profile.email}</div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {profile.phone}</div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {profile.location}</div>
              )}
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {profile?.total_experience_years || 0} years experience</div>
            </div>
          </div>

          {/* Skills */}
          {profile?.skills && profile.skills.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile?.certifications && profile.certifications.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Certifications</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                {profile.certifications.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Evaluation */}
        <div className="lg:col-span-2 space-y-4">
          {evaluation ? (
            <>
              {/* Score Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-3xl font-bold text-slate-800">{evaluation.overall_score}<span className="text-lg text-slate-400">/100</span></p>
                    <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      evaluation.recommendation === 'Strong Shortlist' ? 'bg-green-100 text-green-700' :
                      evaluation.recommendation === 'Shortlist' ? 'bg-blue-100 text-blue-700' :
                      evaluation.recommendation === 'Maybe' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {evaluation.recommendation}
                    </span>
                  </div>
                </div>
                {evaluation.summary && <p className="text-sm text-slate-600 leading-relaxed">{evaluation.summary}</p>}
              </div>

              {/* Category Scores */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {evaluation.categories.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{cat.category}</span>
                        <span className="text-slate-500">{cat.score}/10</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getScoreBarColor(cat.score, 10)}`} style={{ width: `${cat.score * 10}%` }} />
                      </div>
                      {cat.rationale && <p className="text-xs text-slate-500 mt-1">{cat.rationale}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-green-700 mb-3">Strengths</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {evaluation.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-green-500">✓</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-red-700 mb-3">Weaknesses</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {evaluation.weaknesses.map((w, i) => <li key={i} className="flex gap-2"><span className="text-red-500">✗</span>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Missing Skills */}
              {evaluation.missing_skills && evaluation.missing_skills.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Missing Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.missing_skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">Evaluation not available yet.</p>
              <p className="text-xs text-slate-400 mt-1">Status: {data.status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

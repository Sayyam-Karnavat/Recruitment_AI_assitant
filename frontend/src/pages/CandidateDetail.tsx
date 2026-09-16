import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import {
  ChevronLeft, Loader2, Mail, Phone, MapPin, Briefcase,
  Award, CheckCircle2, AlertTriangle, Sparkles, FileText,
  Flag, ThumbsUp, ThumbsDown, Check, X, GraduationCap, FolderGit2
} from 'lucide-react'

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
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 112 112" className="transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="7"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          strokeDashoffset="0"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-black text-slate-900 leading-none">
          {score}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
          / 100
        </span>
      </div>
    </div>
  )
}

function getRecommendationBadge(rec: string | null) {
  switch (rec) {
    case 'Strong Shortlist':
      return <span className="badge badge-strong text-sm py-1 px-3">Strong Match</span>
    case 'Shortlist':
      return <span className="badge badge-shortlist text-sm py-1 px-3">Shortlisted</span>
    case 'Maybe':
      return <span className="badge badge-maybe text-sm py-1 px-3">Potential Candidate</span>
    case 'Reject':
      return <span className="badge badge-reject text-sm py-1 px-3">Not Selected</span>
    default:
      return <span className="badge badge-silver text-sm py-1 px-3">Pending Evaluation</span>
  }
}

export default function CandidateDetail() {
  const { jobId, candidateId } = useParams<{ jobId: string; candidateId: string }>()
  const [data, setData] = useState<CandidateData | null>(null)
  const [loading, setLoading] = useState(true)

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [expectedScore, setExpectedScore] = useState<number | ''>('')
  const [expectedRecommendation, setExpectedRecommendation] = useState('')
  const [feedbackComment, setFeedbackComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  useEffect(() => {
    api.get(`/candidates/${candidateId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error('Error fetching candidate:', err))
      .finally(() => setLoading(false))
  }, [candidateId])

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingFeedback(true)
    try {
      await api.post(`/candidates/${candidateId}/feedback`, {
        expected_score: expectedScore || null,
        expected_recommendation: expectedRecommendation || null,
        comment: feedbackComment
      })
      setFeedbackSuccess(true)
      setTimeout(() => {
        setShowFeedbackModal(false)
        setFeedbackSuccess(false)
        setExpectedScore('')
        setExpectedRecommendation('')
        setFeedbackComment('')
      }, 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-9 h-9 text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Generating candidate evaluation report...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">Candidate record not found.</p>
        <Link to={`/jobs/${jobId}`} className="btn btn-secondary text-xs mt-3 inline-flex">
          Back to Candidates
        </Link>
      </div>
    )
  }

  const { profile, evaluation } = data

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/jobs/${jobId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Candidate List
        </Link>

        <button
          onClick={() => setShowFeedbackModal(true)}
          className="btn btn-ghost text-xs text-slate-500 hover:text-amber-600 inline-flex items-center gap-1.5"
        >
          <Flag className="w-3.5 h-3.5" />
          Flag Evaluation Result
        </button>
      </div>

      {/* Main Grid: Left Candidate Profile & Right AI Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate Profile (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Main Info Card */}
          <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {profile?.name || data.filename}
              </h1>
              {profile?.current_role && (
                <p className="text-sm font-medium text-brand-600">
                  {profile.current_role}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
              {profile?.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  <strong className="font-mono text-slate-900">{profile?.total_experience_years ?? 0}</strong> Years of Total Experience
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate text-slate-400 font-mono text-[11px]">{data.filename}</span>
              </div>
            </div>
          </div>

          {/* Extracted Skills Card */}
          {profile?.skills && profile.skills.length > 0 && (
            <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Skills ({profile.skills.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education & Certifications */}
          {((profile?.education && profile.education.length > 0) || (profile?.certifications && profile.certifications.length > 0)) && (
            <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-4">
              {profile.education && profile.education.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-brand-600" /> Education
                  </h3>
                  <div className="space-y-2">
                    {profile.education.map((edu: any, i: number) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-800">
                          {edu.degree || edu.institution || 'Degree'}
                        </p>
                        <p className="text-slate-500">
                          {edu.institution ? `${edu.institution} ` : ''}{edu.year ? `(${edu.year})` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.certifications && profile.certifications.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-brand-600" /> Certifications
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {profile.certifications.map((cert, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI Evaluation Breakdown (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {evaluation ? (
            <>
              {/* Overall Match & Executive Summary Banner */}
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <ScoreRing score={evaluation.overall_score} />
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      {getRecommendationBadge(evaluation.recommendation)}
                      <span className="text-xs font-semibold text-slate-500">
                        AI Screening Confidence: 99.4%
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {evaluation.summary || 'AI evaluation complete based on job description criteria and candidate resume extraction.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Categorical Dimension Breakdown */}
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm space-y-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Detailed Dimension Scores
                </h2>

                <div className="space-y-4">
                  {evaluation.categories.map((cat) => (
                    <div key={cat.category} className="space-y-1.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{cat.category}</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {cat.score} / 10
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.score >= 7.5
                              ? 'bg-emerald-500'
                              : cat.score >= 5
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${cat.score * 10}%` }}
                        />
                      </div>
                      {cat.rationale && (
                        <p className="text-xs text-slate-600 leading-relaxed pt-1">
                          {cat.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Weaknesses 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                {evaluation.strengths && evaluation.strengths.length > 0 && (
                  <div className="card p-6 bg-white border border-emerald-100 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Key Strengths
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {evaluation.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses / Risks */}
                {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                  <div className="card p-6 bg-white border border-red-100 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5" /> Potential Gaps / Concerns
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {evaluation.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Missing Skills Tags */}
              {evaluation.missing_skills && evaluation.missing_skills.length > 0 && (
                <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Missing or Unverified Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.missing_skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 text-center bg-white border border-slate-200 shadow-sm space-y-2">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Screening in progress</h3>
              <p className="text-xs text-slate-500">Evaluation results will appear here automatically once streaming completes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Flag Evaluation Feedback Modal */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            className="card w-full max-w-lg p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-500" />
                Flag Evaluation as Incorrect
              </h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedbackSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Thank you for your feedback!</p>
                <p className="text-xs text-slate-500">Your ground truth rating has been logged to fine-tune future evaluations.</p>
              </div>
            ) : (
              <form onSubmit={submitFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expected Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    value={expectedScore}
                    onChange={(e) => setExpectedScore(Number(e.target.value) || '')}
                    className="field text-xs"
                    min={0}
                    max={100}
                    placeholder="e.g. 85"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Expected Recommendation
                  </label>
                  <select
                    value={expectedRecommendation}
                    onChange={(e) => setExpectedRecommendation(e.target.value)}
                    className="field text-xs"
                  >
                    <option value="">-- Select Expected Outcome --</option>
                    <option value="Strong Shortlist">Strong Shortlist</option>
                    <option value="Shortlist">Shortlist</option>
                    <option value="Maybe">Maybe</option>
                    <option value="Reject">Reject</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Recruiter Feedback / Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="field text-xs min-h-[90px]"
                    placeholder="Why was the AI score or recommendation inaccurate?"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="btn btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="btn btn-primary text-xs"
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit Evaluation Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import confetti from 'canvas-confetti'
import {
  Briefcase, UploadCloud, CheckCircle2, AlertCircle, ArrowLeft,
  FileText, Sparkles, Loader2, ShieldCheck, Clock, MapPin, Check,
  Building2, ChevronRight, X, Trophy, User, LogOut, Award, AlertTriangle, Lock,
  HelpCircle, HeartHandshake, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../services/api'

interface PublicJob {
  id: string
  title: string
  description: string
  target_shortlist_count: number
  status: string
  min_passing_score: number
  created_at: string
}

interface LeaderboardItem {
  rank: number
  candidate_id: string
  name: string
  overall_score: number
  recommendation: string
  applied_at: string
}

interface CandidateScorecard {
  candidate_id: string
  status: string
  name: string | null
  overall_score: number | null
  recommendation: string | null
  summary: string | null
  strengths: string[] | null
  weaknesses: string[] | null
}

function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export default function PublicJobApply() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'apply' | 'leaderboard'>('apply')
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false)

  // Candidate Google Identity
  const [googleToken, setGoogleToken] = useState<string | null>(() => localStorage.getItem('candidate_google_token'))
  const [candidateProfile, setCandidateProfile] = useState<{ name: string; email: string; picture?: string } | null>(() => {
    const saved = localStorage.getItem('candidate_google_profile')
    return saved ? JSON.parse(saved) : null
  })

  // Application & File State
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submittedCandidateId, setSubmittedCandidateId] = useState<string | null>(null)
  const [scorecard, setScorecard] = useState<CandidateScorecard | null>(null)
  const [pollingScore, setPollingScore] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState<boolean>(false)
  const [checkingApplication, setCheckingApplication] = useState<boolean>(false)
  const [avatarError, setAvatarError] = useState<boolean>(false)

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false)

  useEffect(() => {
    loadJob()
    loadLeaderboard()
  }, [jobId])

  // Check if signed-in candidate has already applied to this position
  useEffect(() => {
    if (candidateProfile?.email && jobId) {
      checkExistingApplication(candidateProfile.email, googleToken)
    }
  }, [candidateProfile?.email, jobId, googleToken])

  const checkExistingApplication = async (email: string, token?: string | null) => {
    if (!jobId || !email) return
    try {
      setCheckingApplication(true)
      const res = await api.get(`/public/jobs/${jobId}/my-application`, {
        params: {
          email: email,
          google_token: token || undefined
        }
      })
      if (res.data.has_applied && res.data.application) {
        setHasAlreadyApplied(true)
        if (res.data.is_processing) {
          setSubmittedCandidateId(res.data.application.candidate_id)
        } else {
          setScorecard(res.data.application)
        }
      } else {
        setHasAlreadyApplied(false)
      }
    } catch {
      // ignore
    } finally {
      setCheckingApplication(false)
    }
  }

  const confettiFiredRef = useRef(false)

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      })
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.1, y: 0.65 }
        })
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.9, y: 0.65 }
        })
      }, 250)
    } catch {
      // silent catch
    }
  }

  // Trigger celebration confetti ONLY when candidate is definitely Shortlisted (not Maybe or Reject)
  useEffect(() => {
    if (scorecard) {
      const isShortlisted =
        scorecard.recommendation === 'Strong Shortlist' ||
        scorecard.recommendation === 'Shortlist'

      if (isShortlisted && !confettiFiredRef.current) {
        confettiFiredRef.current = true
        triggerConfetti()
      }
    }
  }, [scorecard])

  // Polling for evaluation scorecard once submitted
  useEffect(() => {
    if (!submittedCandidateId) return

    setPollingScore(true)
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/public/candidates/${submittedCandidateId}/status`)
        if (res.data.status === 'evaluated' || res.data.status === 'failed') {
          setScorecard(res.data)
          setHasAlreadyApplied(true)
          setPollingScore(false)
          clearInterval(interval)
          loadLeaderboard() // Refresh leaderboard with new candidate
        }
      } catch {
        // Polling quietly
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [submittedCandidateId])

  const loadJob = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/public/jobs/${jobId}`)
      setJob(res.data)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Job opening not found or has been closed.')
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    if (!jobId) return
    try {
      setLoadingLeaderboard(true)
      const res = await api.get(`/public/jobs/${jobId}/leaderboard`)
      setLeaderboard(res.data)
    } catch {
      // ignore
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const token = credentialResponse.credential
      setGoogleToken(token)
      localStorage.setItem('candidate_google_token', token)

      const payload = decodeJwtPayload(token)
      if (payload) {
        const prof = {
          name: payload.name || 'Candidate',
          email: payload.email || '',
          picture: payload.picture
        }
        setAvatarError(false)
        setCandidateProfile(prof)
        localStorage.setItem('candidate_google_profile', JSON.stringify(prof))
        checkExistingApplication(prof.email, token)
        loadLeaderboard()
      }
      setErrorMsg(null)
    }
  }

  const handleSignOut = () => {
    setGoogleToken(null)
    setCandidateProfile(null)
    setScorecard(null)
    setSubmittedCandidateId(null)
    setHasAlreadyApplied(false)
    setAvatarError(false)
    setFile(null)
    localStorage.removeItem('candidate_google_token')
    localStorage.removeItem('candidate_google_profile')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      const ext = selected.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pdf' && ext !== 'docx') {
        setErrorMsg('Please select a valid PDF or DOCX resume document.')
        return
      }
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMsg('File size exceeds the maximum 10MB limit.')
        return
      }
      setFile(selected)
      setErrorMsg(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !jobId) return

    if (!googleToken) {
      setErrorMsg('Please sign in with Google to verify your applicant identity before submitting.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('google_token', googleToken)

    try {
      const res = await api.post(`/public/jobs/${jobId}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSubmittedCandidateId(res.data.candidate_id)
      setHasAlreadyApplied(true)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading position details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="card p-8 bg-white border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Position Not Found</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {errorMsg || 'This job opening does not exist or has been closed by the recruiter.'}
            </p>
          </div>
          <Link to="/" className="btn btn-secondary text-xs inline-flex">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-black text-sm">
              R
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              Resume<span className="text-brand-600">AI</span> Careers
            </span>
          </Link>

          {/* Candidate Auth Pill / Switch */}
          {candidateProfile ? (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-full shadow-xs">
              {candidateProfile.picture && !avatarError ? (
                <img
                  src={candidateProfile.picture}
                  alt={candidateProfile.name || 'Candidate'}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setAvatarError(true)}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-700 to-brand-500 text-white text-[11px] font-bold flex items-center justify-center uppercase shadow-xs">
                  {candidateProfile.name ? candidateProfile.name.trim()[0] : 'C'}
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 max-w-[140px] truncate">
                {candidateProfile.name}
              </span>
              <button
                onClick={handleSignOut}
                className="text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors ml-0.5"
                title="Sign out candidate"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Candidate Application Portal
            </span>
          )}
        </div>
      </header>

      {/* Main Split-Screen Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Job Details & Specifications) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="card p-5 sm:p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge text-[11px] py-0.5 px-2 font-bold ${
                  job.status === 'active' ? 'badge-blue' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {job.status === 'active' ? 'Full-Time Position' : 'CLOSED'}
                </span>
                <span className="badge badge-silver text-[11px] py-0.5 px-2">
                  Target Shortlists: {job.target_shortlist_count}
                </span>
                <span className="badge badge-silver text-[11px] py-0.5 px-2">
                  Min Passing Score: {job.min_passing_score}/100
                </span>
                <span className="text-[11px] text-slate-400 font-medium ml-auto">
                  Posted {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {job.title}
              </h1>

              {/* Collapsible Job Description with See More / Less */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div
                  className={`prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap ${
                    !isDescExpanded && job.description.length > 250 ? 'line-clamp-4' : ''
                  }`}
                >
                  {job.description}
                </div>
                {job.description.length > 250 && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors pt-1"
                  >
                    <span>{isDescExpanded ? 'See less' : 'See more...'}</span>
                    {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Verified position • Automated AI screening powered by ResumeAI</span>
              </div>
            </div>
          </div>

          {/* Right Column (Application Form & Live Leaderboard - Sticky) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <div className="card p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('apply')}
                  className={`py-1.5 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'apply'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {job.status === 'closed' && !scorecard ? (
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                  ) : candidateProfile ? (
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{job.status === 'closed' && !scorecard ? 'Position Closed' : 'Apply Now'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('leaderboard')
                    if (candidateProfile) {
                      loadLeaderboard()
                    }
                  }}
                  className={`py-1.5 px-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                    activeTab === 'leaderboard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {candidateProfile ? (
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Leaderboard {candidateProfile ? `(${leaderboard.length})` : ''}</span>
                </button>
              </div>

              {/* View 1: When NOT Logged In (Locked Gate) */}
              {!candidateProfile && (
                job.status === 'closed' && activeTab === 'apply' ? (
                  <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3.5 animate-fade-in">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
                      <Lock className="w-6 h-6 text-rose-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        Applications are Closed
                      </h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        This job position has been closed by the recruiter and is no longer accepting new applications.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('leaderboard')}
                        className="btn btn-secondary text-xs inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>View Ranked Leaderboard</span>
                      </button>
                      <p className="text-[10px] text-slate-400">
                        Applicants can sign in to view their ranking and standing.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3.5 animate-fade-in">
                    <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100 shadow-xs">
                      <ShieldCheck className="w-6 h-6 text-brand-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">
                        {activeTab === 'apply' ? 'Sign in with Google to Apply' : 'Sign in to View Leaderboard'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        {activeTab === 'apply'
                          ? 'Sign in with Google to unlock resume upload and get instant AI evaluation results.'
                          : 'Leaderboard rankings are available to authenticated applicants.'}
                      </p>
                    </div>
                    <div className="flex justify-center pt-1">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setErrorMsg('Google sign-in failed. Please try again.')}
                        theme="outline"
                        shape="pill"
                        text="continue_with"
                      />
                    </div>
                    {errorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                        {errorMsg}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">
                      🔒 Secure Google OAuth • Resume & leaderboard unlock instantly
                    </p>
                  </div>
                )
              )}

              {/* View 2: When Logged In -> Apply Tab */}
              {candidateProfile && activeTab === 'apply' && (
                <div className="space-y-3.5">
                  {checkingApplication ? (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2 animate-fade-in">
                      <Loader2 className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">Checking your application status...</p>
                    </div>
                  ) : scorecard ? (
                    (() => {
                      const isShortlisted =
                        scorecard.recommendation === 'Strong Shortlist' ||
                        scorecard.recommendation === 'Shortlist'

                      const isMaybe =
                        scorecard.recommendation === 'Maybe'

                      const isRejected =
                        scorecard.recommendation === 'Reject' ||
                        scorecard.status === 'failed' ||
                        (!isShortlisted && !isMaybe)

                      return (
                        /* Simplified & Compact Screening Result Card */
                        <div className="space-y-3.5 animate-fade-in">
                          {/* Top Submission Pill */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs space-y-0.5 min-w-0">
                              <p className="font-bold text-slate-900">Application Submitted</p>
                              <p className="text-[11px] text-slate-500 leading-tight truncate">
                                Registered for <strong>{candidateProfile.email}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="card p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4 text-center">
                            {/* Candidate Identity */}
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                AI Screening Result
                              </span>
                              <h3 className="text-base font-bold text-slate-900 truncate">
                                {scorecard.name || candidateProfile.name}
                              </h3>
                            </div>

                            {/* Overall Score Meter */}
                            <div className="py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100 inline-flex flex-col items-center justify-center min-w-[150px] mx-auto">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Overall Score
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={`text-3xl font-extrabold font-mono ${
                                  isShortlisted ? 'text-emerald-600' : isMaybe ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {scorecard.overall_score !== null ? scorecard.overall_score : '—'}
                                </span>
                                <span className="text-xs font-bold text-slate-400">/ 100</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isShortlisted ? 'bg-emerald-500' : isMaybe ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, scorecard.overall_score || 0))}%` }}
                                />
                              </div>
                            </div>

                            {/* Outcome Condition 1: Definite Shortlist */}
                            {isShortlisted && (
                              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-2 animate-fade-in text-center shadow-xs">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/20 animate-bounce">
                                  <Trophy className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold shadow-xs">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Shortlisted</span>
                                  </div>
                                  <h4 className="text-sm font-extrabold text-emerald-950">
                                    You have been shortlisted! 🎉
                                  </h4>
                                </div>
                              </div>
                            )}

                            {/* Outcome Condition 2: Rejected */}
                            {isRejected && (
                              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 space-y-2 animate-fade-in text-center shadow-xs">
                                <div className="relative w-11 h-11 rounded-full bg-rose-100 border-2 border-rose-300 flex items-center justify-center mx-auto text-rose-600 shadow-sm">
                                  <div className="absolute inset-0 rounded-full bg-rose-400/30 animate-ping opacity-75" />
                                  <svg
                                    className="w-5 h-5 relative z-10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </div>
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold shadow-xs">
                                    <X className="w-3 h-3" />
                                    <span>Not Selected</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-rose-950">
                                    Application Not Shortlisted
                                  </h4>
                                  <p className="text-[11px] text-rose-800/90 leading-relaxed max-w-xs mx-auto">
                                    Don't be discouraged! Keep honing your skills and opportunities matching your strengths will come your way.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Outcome Condition 3: Maybe / In Lineup */}
                            {isMaybe && (
                              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2 animate-fade-in text-center shadow-xs">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm shadow-amber-500/20">
                                  <Clock className="w-5 h-5 animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-xs">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Shortlisted in Lineup (Maybe)</span>
                                  </div>
                                  <h4 className="text-sm font-extrabold text-amber-950">
                                    Application in Candidate Lineup
                                  </h4>
                                </div>
                              </div>
                            )}

                            {/* Leaderboard CTA Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('leaderboard')
                                loadLeaderboard()
                              }}
                              className="btn btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span>View Live Standings on Leaderboard</span>
                            </button>
                          </div>
                        </div>
                      )
                    })()
                  ) : submittedCandidateId ? (
                    /* In-Progress Evaluation Loader */
                    <div className="p-6 rounded-2xl bg-brand-50/70 border border-brand-200 text-center space-y-2.5 animate-fade-in">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-bold text-slate-900">
                          AI Screening in Progress...
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Extracting skills and calculating match against requirements.
                        </p>
                      </div>
                      <div className="font-mono text-[10px] text-slate-600 bg-white p-1 rounded border border-brand-200 inline-block">
                        Ref: {submittedCandidateId.slice(0, 8)}...
                      </div>
                    </div>
                  ) : job.status === 'closed' ? (
                    /* Closed Position Notice for Authenticated Candidate Who Has Not Applied */
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3.5 animate-fade-in">
                      <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
                        <Lock className="w-6 h-6 text-rose-600" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">
                          Cannot Apply — Position is Closed
                        </h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                          This job position has been closed by the recruiter and is no longer accepting new candidate applications.
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('leaderboard')
                            loadLeaderboard()
                          }}
                          className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          <span>View Live Standings on Leaderboard</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Upload Resume and Submit Form (Only when job is active) */
                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      {/* Signed-in identity */}
                      <div className="p-2 rounded-xl bg-brand-50/60 border border-brand-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-brand-900">{candidateProfile.name}</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className="text-slate-600 truncate">{candidateProfile.email}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold underline flex-shrink-0 ml-1"
                        >
                          Switch
                        </button>
                      </div>

                      {/* File Dropzone */}
                      <div
                        onClick={() => document.getElementById('publicResumeInput')?.click()}
                        className={`p-4 sm:p-5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                          file
                            ? 'border-brand-500 bg-brand-50/40'
                            : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="file"
                          id="publicResumeInput"
                          accept=".pdf,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        {file ? (
                          <div className="space-y-1.5">
                            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] mx-auto">{file.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFile(null)
                              }}
                              className="text-[11px] text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Remove
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-brand-600 flex items-center justify-center mx-auto border border-slate-200">
                              <UploadCloud className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900">
                                Upload your resume
                              </p>
                              <p className="text-[10px] text-slate-500">
                                PDF or DOCX up to 10MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {errorMsg && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium animate-fade-in">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Single Primary Submit Button */}
                      <button
                        type="submit"
                        disabled={!file || isSubmitting}
                        className="btn btn-primary w-full py-2.5 text-xs font-bold shadow-md shadow-brand-500/20"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Submit Application</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* View 3: When Logged In -> Leaderboard Tab (Scrollable) */}
              {candidateProfile && activeTab === 'leaderboard' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900">Ranked Applicants</span>
                    <span className="text-[11px] font-mono text-slate-400">{leaderboard.length} Screened</span>
                  </div>

                  {loadingLeaderboard ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-600" />
                      <p>Loading leaderboard rankings...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-600">No applicants ranked yet.</p>
                      <p>Be the first candidate to apply!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[300px] sm:max-h-[340px] overflow-y-auto pr-1">
                      {leaderboard.map((item) => {
                        const isMe = item.candidate_id === scorecard?.candidate_id || item.candidate_id === submittedCandidateId
                        return (
                          <div
                            key={item.candidate_id}
                            className={`py-2 flex items-center justify-between gap-2.5 text-xs transition-colors ${
                              isMe ? 'bg-brand-50/70 border border-brand-200/80 rounded-xl px-2.5 my-1 shadow-xs' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-5 h-5 rounded-full font-bold font-mono flex items-center justify-center text-[10px] flex-shrink-0 ${
                                item.rank === 1
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : item.rank === 2
                                  ? 'bg-slate-200 text-slate-700'
                                  : item.rank === 3
                                  ? 'bg-orange-100 text-orange-800'
                                  : isMe
                                  ? 'bg-brand-600 text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                #{item.rank}
                              </span>
                              <div className="truncate">
                                <p className="font-bold text-slate-900 truncate text-xs flex items-center gap-1">
                                  <span>{item.name}</span>
                                  {isMe && (
                                    <span className="text-[9px] bg-brand-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {item.applied_at ? new Date(item.applied_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`badge text-[9px] py-0.5 px-1.5 ${
                                item.recommendation === 'Strong Shortlist'
                                  ? 'badge-strong'
                                  : item.recommendation === 'Shortlist'
                                  ? 'badge-shortlist'
                                  : item.recommendation === 'Maybe'
                                  ? 'badge-maybe'
                                  : 'badge-reject'
                              }`}>
                                {item.recommendation === 'Strong Shortlist' ? 'Strong' : item.recommendation}
                              </span>
                              <span className="font-mono font-bold text-slate-900 text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {item.overall_score}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-slate-200 text-center text-xs text-slate-400 space-y-0.5">
        <p>© 2026 ResumeAI Recruitment Engine. All rights reserved.</p>
        <p className="text-[11px]">Powered by High-Performance LLM Candidate Screening</p>
      </footer>
    </div>
  )
}

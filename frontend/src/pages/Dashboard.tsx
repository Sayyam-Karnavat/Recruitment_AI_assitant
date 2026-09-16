import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Users, Loader2, Share2, Check, Sparkles, Briefcase, Target, Award, ArrowUpRight, Search, Trash2 } from 'lucide-react'

interface Job {
  id: string
  title: string
  description: string
  target_shortlist_count: number
  status: string
  created_at: string
  candidate_count: number
  custom_prompt?: string
  active_days_limit?: number
  max_applications?: number
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState<number | ''>(10)
  const [minPassingScore, setMinPassingScore] = useState<number | ''>(50)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [activeDaysLimit, setActiveDaysLimit] = useState<number | ''>('')
  const [maxApplications, setMaxApplications] = useState<number | ''>('')
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs')
      setJobs(res.data)
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    // Client-side validations
    const cleanTitle = title.trim()
    const cleanDesc = description.trim()

    if (!cleanTitle) {
      setCreateError('Please enter a job title.')
      return
    }
    if (cleanTitle.length < 3) {
      setCreateError('Job title is too short (minimum 3 characters required).')
      return
    }
    if (!cleanDesc) {
      setCreateError('Please provide a job description with requirements.')
      return
    }
    if (cleanDesc.length < 15) {
      setCreateError('Job description is too brief (minimum 15 characters required).')
      return
    }
    if (targetCount !== '' && (Number(targetCount) < 1 || Number(targetCount) > 500)) {
      setCreateError('Target shortlists count must be between 1 and 500.')
      return
    }
    if (minPassingScore !== '' && (Number(minPassingScore) < 1 || Number(minPassingScore) > 100)) {
      setCreateError('Minimum passing score must be between 1 and 100.')
      return
    }
    if (activeDaysLimit !== '' && (Number(activeDaysLimit) < 1 || Number(activeDaysLimit) > 365)) {
      setCreateError('Active days limit must be between 1 and 365 days.')
      return
    }
    if (maxApplications !== '' && (Number(maxApplications) < 1 || Number(maxApplications) > 50000)) {
      setCreateError('Max applications limit must be between 1 and 50,000.')
      return
    }

    setCreating(true)
    try {
      await api.post('/jobs', {
        title: cleanTitle,
        description: cleanDesc,
        target_shortlist_count: targetCount === '' ? 10 : Number(targetCount),
        min_passing_score: minPassingScore === '' ? 50 : Number(minPassingScore),
        custom_prompt: customPrompt.trim() || null,
        active_days_limit: activeDaysLimit === '' ? null : Number(activeDaysLimit),
        max_applications: maxApplications === '' ? null : Number(maxApplications),
      })
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setTargetCount(10)
      setMinPassingScore(50)
      setCustomPrompt('')
      setActiveDaysLimit('')
      setMaxApplications('')
      fetchJobs()
    } catch (err: any) {
      if (!err.response) {
        setCreateError('Network error: Unable to connect to server. Please check your network.')
      } else {
        const detail = err.response.data?.detail
        if (Array.isArray(detail)) {
          const msg = detail.map((d: any) => d.msg || 'Invalid field input').join(', ')
          setCreateError(msg)
        } else if (typeof detail === 'string') {
          setCreateError(detail)
        } else if (err.response.status === 401) {
          setCreateError('Session expired. Please log in again.')
        } else if (err.response.status === 403) {
          setCreateError('You do not have permission to create this position.')
        } else if (err.response.status === 500) {
          setCreateError('Server error while saving position. Please try again.')
        } else {
          setCreateError('Failed to create job. Please verify your inputs and retry.')
        }
      }
    } finally {
      setCreating(false)
    }
  }

  const copyCareerLink = (jobId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/careers/${jobId}`
    navigator.clipboard.writeText(url)
    setCopiedJobId(jobId)
    setTimeout(() => setCopiedJobId(null), 2500)
  }

  const handleDeleteJob = async (jobId: string, jobTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!window.confirm(`Are you sure you want to delete the job "${jobTitle}"? All candidate resumes and evaluations will be permanently removed.`)) {
      return
    }
    try {
      await api.delete(`/jobs/${jobId}`)
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete job')
    }
  }

  const filteredJobs = jobs.filter((j) =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalCandidates = jobs.reduce((acc, j) => acc + (j.candidate_count || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Recruitment Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your open jobs, share application links, and review AI screening shortlists.
          </p>
        </div>

        <button
          id="create-job-button"
          onClick={() => {
            setShowCreate(true)
            setCreateError('')
          }}
          className="btn btn-primary shadow-md shadow-blue-500/20"
          aria-label="Create new job"
        >
          <Plus size={18} />
          <span>Create New Job</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Active Jobs</span>
            <Briefcase size={18} className="text-blue-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{jobs.length}</div>
          <span className="text-[11px] sm:text-xs text-slate-500 mt-1 block">Open positions</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Screened</span>
            <Users size={18} className="text-sky-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalCandidates}</div>
          <span className="text-[11px] sm:text-xs text-slate-500 mt-1 block">Candidates</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Shortlists</span>
            <Target size={18} className="text-indigo-600 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {jobs.reduce((acc, j) => acc + (j.target_shortlist_count || 0), 0)}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-500 mt-1 block">Quota target</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Avg Time</span>
            <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">~2.5s</div>
          <span className="text-[11px] sm:text-xs text-slate-500 mt-1 block">Per resume</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Search job titles or requirements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
        />
      </div>

      {/* Create Job Modal (Mounted to body root for complete full-viewport blur coverage) */}
      {showCreate && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 w-full max-w-xl shadow-2xl fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create New Job Position</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define role specifications and custom semantic screening criteria.</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                  placeholder="e.g. Senior Backend Engineer (Distributed Systems)"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Description & Requirements *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field min-h-[140px]"
                  placeholder="Paste key responsibilities, required frameworks, experience expectations, and qualifications..."
                  required
                  minLength={10}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom AI Evaluation Prompt (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="field min-h-[80px]"
                  placeholder="e.g. Give heavy weight to candidates who built high-throughput microservices in Python/Go, and strictly verify at least 3 years of production experience."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Shortlists
                  </label>
                  <input
                    type="number"
                    value={targetCount}
                    onChange={(e) => {
                      const val = e.target.value
                      setTargetCount(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    max={500}
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" title="Auto-reject candidates scoring below this score out of 100">
                    Passing Score (out of 100)
                  </label>
                  <input
                    type="number"
                    value={minPassingScore}
                    onChange={(e) => {
                      const val = e.target.value
                      setMinPassingScore(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    max={100}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Active Days Limit
                  </label>
                  <input
                    type="number"
                    value={activeDaysLimit}
                    onChange={(e) => {
                      const val = e.target.value
                      setActiveDaysLimit(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Applications
                  </label>
                  <input
                    type="number"
                    value={maxApplications}
                    onChange={(e) => {
                      const val = e.target.value
                      setMaxApplications(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    placeholder="e.g. 150"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  <span>{creating ? 'Creating...' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Job Cards Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-sm">
            <Briefcase size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No job positions found</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {searchQuery
              ? 'No jobs match your search query. Try searching for a different keyword.'
              : 'Create your first job posting to generate shareable application links and start AI screening.'}
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>Create Your First Job</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Status, Date & Delete Action */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="badge badge-strong">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {job.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => handleDeleteJob(job.id, job.title, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 hover:opacity-100"
                      title="Delete this position"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Job Title */}
                <Link
                  to={`/jobs/${job.id}`}
                  className="block text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2"
                >
                  {job.title}
                </Link>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-6">
                  {job.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Users size={15} className="text-blue-600" />
                    <span>{job.candidate_count || 0} Candidates</span>
                  </div>
                  <span className="text-slate-400 font-medium">
                    Target: {job.target_shortlist_count}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => copyCareerLink(job.id, e)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      copiedJobId === job.id
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700'
                    }`}
                    title="Copy public candidate application link"
                  >
                    {copiedJobId === job.id ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} className="text-blue-600" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>

                  <Link
                    to={`/jobs/${job.id}`}
                    className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1"
                  >
                    <span>View Job</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

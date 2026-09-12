import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Users, Loader2 } from 'lucide-react'

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

function getBadgeClass(status: string) {
  return status === 'active' ? 'badge badge-active' : 'badge badge-archived'
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetCount, setTargetCount] = useState(10)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [activeDaysLimit, setActiveDaysLimit] = useState<number | ''>('')
  const [maxApplications, setMaxApplications] = useState<number | ''>('')

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

  useEffect(() => { fetchJobs() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      await api.post('/jobs', {
        title,
        description,
        target_shortlist_count: targetCount,
        custom_prompt: customPrompt || null,
        active_days_limit: activeDaysLimit || null,
        max_applications: maxApplications || null
      })
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setTargetCount(10)
      setCustomPrompt('')
      setActiveDaysLimit('')
      setMaxApplications('')
      fetchJobs()
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={24} color="var(--c-brand)" />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32,
      }}>
        <div className="fade-up">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-t1)', letterSpacing: '-0.035em', marginBottom: 2 }}>
            Jobs
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-t2)', margin: 0 }}>
            Manage your job postings and screen candidates.
          </p>
        </div>
        <button
          id="create-job-button"
          onClick={() => { setShowCreate(true); setCreateError('') }}
          className="btn btn-primary fade-up delay-50"
          aria-label="Create new job"
        >
          <Plus size={16} aria-hidden="true" />
          Create Job
        </button>
      </div>

      {/* Create Job Modal - Apple style glass modal */}
      {showCreate && (
        <div
          className="fade-in"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-job-title"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="card fade-up delay-50"
            style={{
              width: '100%', maxWidth: 500, padding: 28,
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="create-job-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--c-t1)', marginBottom: 20 }}>
              Create New Job
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {createError && (
                <div role="alert" className="alert-error">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {createError}
                </div>
              )}

              <div>
                <label htmlFor="job-title" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                  Job Title
                </label>
                <input
                  id="job-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                  placeholder="e.g. Senior Full Stack Developer"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="job-description" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                  Job Description
                </label>
                <textarea
                  id="job-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field"
                  style={{ minHeight: 140, resize: 'vertical' }}
                  placeholder="Paste your full job description here…"
                  required
                  minLength={10}
                />
              </div>

              <div>
                <label htmlFor="target-count" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                  Target Shortlist Count
                </label>
                <input
                  id="target-count"
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className="field"
                  min={1}
                  max={100}
                />
              </div>

              <div>
                <label htmlFor="custom-prompt" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                  Custom AI Filtering Criteria (Optional)
                </label>
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="field"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="e.g. Focus heavily on candidates with startup experience..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label htmlFor="active-days" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                    Active Days Limit (Optional)
                  </label>
                  <input
                    id="active-days"
                    type="number"
                    value={activeDaysLimit}
                    onChange={(e) => setActiveDaysLimit(e.target.value ? Number(e.target.value) : '')}
                    className="field"
                    min={1}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label htmlFor="max-apps" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-t2)', marginBottom: 6 }}>
                    Max Applications (Optional)
                  </label>
                  <input
                    id="max-apps"
                    type="number"
                    value={maxApplications}
                    onChange={(e) => setMaxApplications(e.target.value ? Number(e.target.value) : '')}
                    className="field"
                    min={1}
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {creating ? 'Creating…' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Cards */}
      {jobs.length === 0 ? (
        <div className="card fade-up delay-100" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--c-brand-dim)', color: 'var(--c-brand-hi)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="24" height="24" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 11h8M11 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--c-t1)', marginBottom: 4 }}>No jobs yet</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--c-t3)', marginBottom: 24, maxWidth: 280 }}>
            Create your first job posting to start screening candidates.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={16} aria-hidden="true" />
            Create Job
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {jobs.map((job, idx) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="card-interactive fade-up"
              style={{ padding: 24, animationDelay: `${50 + idx * 50}ms` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <h3 style={{
                  fontSize: '1rem', fontWeight: 600, color: 'var(--c-t1)',
                  margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {job.title}
                </h3>
                <span className={getBadgeClass(job.status)}>{job.status}</span>
              </div>

              <p style={{
                fontSize: '0.8125rem', color: 'var(--c-t2)', lineHeight: 1.6,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                marginBottom: 20,
              }}>
                {job.description}
              </p>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                fontSize: '0.75rem', color: 'var(--c-t3)', fontWeight: 500,
                marginTop: 'auto',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} aria-hidden="true" />
                  <span className="tabular">{job.candidate_count}</span> candidates
                </span>
                <span>Target: <span className="tabular">{job.target_shortlist_count}</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

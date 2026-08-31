import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'
import { Loader2, ChevronLeft, Download, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Job {
  id: string
  title: string
  description: string
  target_shortlist_count: number
  status: string
  candidate_count: number
}

interface Candidate {
  id: string
  filename: string
  status: string
  name: string | null
  overall_score: number | null
  recommendation: string | null
  created_at: string
}

function getScoreChip(score: number) {
  if (score >= 75) return 'score-chip score-high'
  if (score >= 50) return 'score-chip score-mid'
  return 'score-chip score-low'
}

function getRecommendationClass(rec: string) {
  switch (rec) {
    case 'Strong Shortlist': return 'badge badge-strong'
    case 'Shortlist': return 'badge badge-shortlist'
    case 'Maybe': return 'badge badge-maybe'
    default: return 'badge badge-reject'
  }
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`)
      setJob(res.data)
    } catch { /* */ }
  }

  const fetchCandidates = async () => {
    try {
      const res = await api.get(`/jobs/${id}/candidates`)
      setCandidates(res.data)
    } catch { /* */ }
  }

  useEffect(() => {
    Promise.all([fetchJob(), fetchCandidates()]).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!batchId) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${id}/batch/${batchId}`)
        setBatchProgress({ processed: res.data.processed_files, total: res.data.total_files })
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(interval)
          setBatchId(null)
          setUploading(false)
          fetchCandidates()
          fetchJob()
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [batchId])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null)
    if (acceptedFiles.length === 0) return

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    for (const f of acceptedFiles) {
      if (f.size > MAX_FILE_SIZE) {
        setUploadError(`"${f.name}" exceeds the maximum allowed size of 5 MB.`)
        return
      }
    }

    setUploading(true)
    const formData = new FormData()
    acceptedFiles.forEach((f) => formData.append('files', f))

    try {
      const res = await api.post(`/jobs/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBatchId(res.data.batch_id)
      setBatchProgress({ processed: 0, total: res.data.total_files })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setUploadError(error.response?.data?.detail || 'Upload failed')
      setUploading(false)
    }
  }, [id])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip'],
    },
    disabled: uploading,
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={24} color="var(--c-brand)" />
      </div>
    )
  }

  const progressPct = batchProgress.total ? (batchProgress.processed / batchProgress.total) * 100 : 0

  return (
    <div style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Back */}
      <div className="fade-up">
        <Link to="/dashboard" className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
          <ChevronLeft size={16} aria-hidden="true" />
          Jobs
        </Link>
      </div>

      {/* Header card */}
      <div className="card fade-up delay-50" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--c-t1)', letterSpacing: '-0.02em' }}>
                {job?.title}
              </h1>
              <span className={`badge ${job?.status === 'active' ? 'badge-active' : 'badge-archived'}`}>
                {job?.status}
              </span>
            </div>
            <p style={{
              fontSize: '0.875rem', color: 'var(--c-t2)', margin: 0, lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {job?.description}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href={`/api/jobs/${id}/export/csv`}
              className="btn btn-ghost"
              aria-label="Export candidates as CSV"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
            >
              <Download size={14} aria-hidden="true" />
              CSV
            </a>
            <a
              href={`/api/jobs/${id}/export/pdf`}
              className="btn btn-ghost"
              aria-label="Export candidates as PDF"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
            >
              <Download size={14} aria-hidden="true" />
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div role="alert" className="alert-error fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {uploadError}
          </div>
          <button
            onClick={() => setUploadError(null)}
            style={{
              background: 'none', border: 'none', color: 'inherit',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', opacity: 0.8,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className="fade-up delay-100"
        style={{
          border: `2px dashed ${isDragActive ? 'var(--c-brand)' : 'var(--c-border-hi)'}`,
          background: isDragActive ? 'var(--c-brand-dim)' : 'rgba(13,17,23,0.4)',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          transition: 'all 200ms var(--ease-spring)',
        }}
      >
        <input {...getInputProps()} aria-label="Resume file input" />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Loader2 size={32} className="animate-spin" color="var(--c-brand)" />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--c-t1)', margin: 0 }}>
              Processing {batchProgress.processed}/{batchProgress.total} files…
            </p>
            <div className="score-bar-track" style={{ width: 240 }}>
              <div className="score-bar-fill" style={{ width: `${progressPct}%`, background: 'var(--c-brand)' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--c-brand-dim)', color: 'var(--c-brand-hi)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 13V5M6 9l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--c-t1)', margin: 0 }}>
              {isDragActive ? 'Release to upload' : 'Drop resumes here or click to browse'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-t3)', margin: 0 }}>
              PDF or DOCX &middot; Max 5&nbsp;MB & 10 pages per resume
            </p>
          </div>
        )}
      </div>

      {/* Candidates table */}
      {candidates.length > 0 && (
        <div className="card fade-up delay-150" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--c-border)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-t1)', margin: 0 }}>
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {candidates.map((c, idx) => (
              <Link
                key={c.id}
                to={`/jobs/${id}/candidates/${c.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: idx < candidates.length - 1 ? '1px solid var(--c-border)' : 'none',
                  textDecoration: 'none',
                  background: 'transparent',
                  transition: 'background 120ms var(--ease-spring)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--c-t3)', width: 28 }}>
                    #{idx + 1}
                  </span>
                  <StatusIcon status={c.status} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.9375rem', fontWeight: 500, color: 'var(--c-t1)', margin: '0 0 2px 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.name || c.filename}
                    </p>
                    {c.name && (
                      <p style={{
                        fontSize: '0.75rem', color: 'var(--c-t3)', margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {c.filename}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {c.recommendation && (
                    <span className={getRecommendationClass(c.recommendation)}>
                      {c.recommendation}
                    </span>
                  )}
                  {c.overall_score !== null && (
                    <span className={getScoreChip(c.overall_score)}>
                      {c.overall_score}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'evaluated') return <CheckCircle size={16} color="var(--c-green)" aria-label="Evaluated" style={{ flexShrink: 0 }} />
  if (status === 'failed') return <XCircle size={16} color="var(--c-red)" aria-label="Failed" style={{ flexShrink: 0 }} />
  return <Clock size={16} color="var(--c-orange)" aria-label="Processing" style={{ flexShrink: 0 }} />
}

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'
import {
  Loader2, ChevronLeft, Download, CheckCircle, XCircle, Clock, Trash2,
  Power, Search, X, Share2, CreditCard, Sparkles
} from 'lucide-react'
import { useWallet } from '../context/WalletContext'

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
  const navigate = useNavigate()
  const { refreshBalance, openWalletModal } = useWallet()

  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

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

  const downloadReport = async (format: 'csv' | 'pdf') => {
    try {
      const res = await api.get(`/jobs/${id}/export/${format}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `shortlist_report.${format}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  const toggleJobStatus = async () => {
    if (!job) return
    try {
      const newStatus = job.status === 'active' ? 'closed' : 'active'
      await api.patch(`/jobs/${id}`, { status: newStatus })
      fetchJob()
    } catch (err) {
      console.error('Failed to toggle status', err)
    }
  }

  const deleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this job and all its candidates? This action cannot be undone.')) return
    try {
      await api.delete(`/jobs/${id}`)
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to delete job', err)
    }
  }

  const copyPublicApplyLink = () => {
    const url = `${window.location.origin}/careers/${id}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  useEffect(() => {
    Promise.all([fetchJob(), fetchCandidates()]).finally(() => setLoading(false))
  }, [id])

  // Real-time WebSocket connection for live processing updates
  useEffect(() => {
    if (!id) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/jobs/${id}`
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('Connected to job WebSocket for real-time updates:', id)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'candidate_update') {
            fetchCandidates()
            fetchJob()
            refreshBalance()
            if (data.processed_files && data.total_files) {
              setBatchProgress({ processed: data.processed_files, total: data.total_files })
            }
          } else if (data.type === 'batch_completed') {
            setBatchId(null)
            setUploading(false)
            fetchCandidates()
            fetchJob()
            refreshBalance()
          } else if (data.type === 'batch_failed') {
            setBatchId(null)
            setUploading(false)
            setUploadError(data.error || 'Batch processing failed.')
          }
        } catch (err) {
          console.error('WebSocket parse error:', err)
        }
      }

      ws.onerror = (err) => {
        console.warn('WebSocket error, fallback polling available if needed:', err)
      }
    } catch (err) {
      console.warn('WebSocket init error:', err)
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [id, refreshBalance])

  // Secondary polling fallback only if actively uploading
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
          refreshBalance()
        }
      } catch {
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [batchId, id, refreshBalance])

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
      refreshBalance()
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Upload failed'
      setUploadError(detail)
      setUploading(false)
    }
  }, [id, refreshBalance])

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return

    const urls = urlInput.split(',').map(u => u.trim()).filter(u => u)
    if (urls.length === 0) return

    setUploadError(null)
    setUploading(true)
    try {
      const res = await api.post(`/jobs/${id}/upload-links`, { urls })
      setBatchId(res.data.batch_id)
      setBatchProgress({ processed: 0, total: res.data.total_files })
      setUrlInput('')
      refreshBalance()
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Upload failed'
      setUploadError(detail)
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip'],
    },
    disabled: uploading,
  })

  // Filter candidates by candidate name or filename search
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates
    const q = searchQuery.toLowerCase().trim()
    return candidates.filter(c => {
      const nameMatch = c.name?.toLowerCase().includes(q)
      const fileMatch = c.filename?.toLowerCase().includes(q)
      return nameMatch || fileMatch
    })
  }, [candidates, searchQuery])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={24} color="var(--c-brand)" />
      </div>
    )
  }

  let limitReachedReason = ''
  if (job?.max_applications && job.candidate_count >= job.max_applications) {
    limitReachedReason = `Max applications (${job.max_applications}) reached.`
  } else if (job?.active_days_limit) {
    const createdDate = new Date(job.created_at)
    const expiryDate = new Date(createdDate.getTime() + job.active_days_limit * 24 * 60 * 60 * 1000)
    if (new Date() > expiryDate) {
      limitReachedReason = `Active days limit (${job.active_days_limit} days) reached.`
    }
  }

  const isClosed = job?.status === 'closed' || !!limitReachedReason
  const progressPct = batchProgress.total ? (batchProgress.processed / batchProgress.total) * 100 : 0

  return (
    <div style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top action row */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <Link to="/dashboard" className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
          <ChevronLeft size={16} />
          Back to Dashboard
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={copyPublicApplyLink}
            className="btn btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Copy candidate application link"
          >
            <Share2 size={14} />
            {copiedLink ? 'Link Copied!' : 'Candidate Apply Link'}
          </button>

          {candidates.length > 0 && (
            <>
              <button
                onClick={() => downloadReport('csv')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() => downloadReport('pdf')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> PDF
              </button>
            </>
          )}

          <button
            onClick={toggleJobStatus}
            className={`btn ${job?.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Power size={14} />
            {job?.status === 'active' ? 'Close Job' : 'Reactivate Job'}
          </button>

          <button
            onClick={deleteJob}
            className="btn btn-danger"
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Job details card */}
      <div className="card fade-up delay-50">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className={`badge ${job?.status === 'active' ? 'badge-green' : 'badge-reject'}`}>
                {job?.status.toUpperCase()}
              </span>
              {limitReachedReason && (
                <span className="badge badge-maybe" style={{ background: 'var(--c-amber-dim)', color: 'var(--c-amber)' }}>
                  {limitReachedReason}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--c-t1)', margin: 0 }}>
              {job?.title}
            </h1>
          </div>
        </div>

        <p style={{
          fontSize: '0.875rem', color: 'var(--c-t2)', lineHeight: 1.6,
          marginTop: 12, marginBottom: 16, whiteSpace: 'pre-wrap',
        }}>
          {job?.description}
        </p>

        {/* Custom criteria & limits info */}
        {(job?.custom_prompt || job?.active_days_limit || job?.max_applications) && (
          <div style={{
            background: 'var(--c-elevated)', padding: '12px 16px', borderRadius: 8,
            border: '1px solid var(--c-border)', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {job.custom_prompt && (
              <div>
                <strong style={{ color: 'var(--c-t2)' }}>Special Evaluation Criteria: </strong>
                <span style={{ color: 'var(--c-t1)' }}>{job.custom_prompt}</span>
              </div>
            )}
            {job.active_days_limit && (
              <div>
                <strong style={{ color: 'var(--c-t2)' }}>Active Days Limit: </strong>
                <span style={{ color: 'var(--c-t1)' }}>{job.active_days_limit} days</span>
              </div>
            )}
            {job.max_applications && (
              <div>
                <strong style={{ color: 'var(--c-t2)' }}>Max Applications: </strong>
                <span style={{ color: 'var(--c-t1)' }}>{job.max_applications} candidates</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload error banner (with direct Wallet Top-Up action if 402 Insufficient Credits) */}
      {uploadError && (
        <div role="alert" className="alert-error fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: '0.875rem' }}>{uploadError}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {uploadError.toLowerCase().includes('credit') && (
              <button
                onClick={openWalletModal}
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <CreditCard size={13} /> Top Up Wallet
              </button>
            )}
            <button
              onClick={() => setUploadError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '0.75rem', cursor: 'pointer', opacity: 0.8 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className="fade-up delay-100"
        style={{
          border: `2px dashed ${isDragActive && !isClosed ? 'var(--c-brand)' : 'var(--c-border-hi)'}`,
          background: isDragActive && !isClosed ? 'var(--c-brand-dim)' : 'rgba(13,17,23,0.4)',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          cursor: uploading || isClosed ? 'not-allowed' : 'pointer',
          opacity: uploading || isClosed ? 0.6 : 1,
          transition: 'all 200ms var(--ease-spring)',
          pointerEvents: isClosed ? 'none' : 'auto',
        }}
      >
        <input {...getInputProps({ disabled: isClosed || uploading })} aria-label="Resume file input" />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Loader2 size={32} className="animate-spin" color="var(--c-brand)" />
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-t1)', margin: 0 }}>
              AI Streaming & Evaluating: {batchProgress.processed}/{batchProgress.total} resumes processed…
            </p>
            <div className="score-bar-track" style={{ width: 260 }}>
              <div className="score-bar-fill" style={{ width: `${progressPct}%`, background: 'var(--c-brand)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--c-t3)' }}>
              Real-time updates streaming over WebSocket • 0 disk retention
            </span>
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
              {isClosed ? 'Uploads disabled (Job Closed)' : (isDragActive ? 'Release to upload' : 'Drop resumes here or click to browse')}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-t3)', margin: 0 }}>
              PDF, DOCX, or ZIP &middot; 1 Credit per resume &middot; Zero disk storage
            </p>
          </div>
        )}
      </div>

      {/* URL Link Upload */}
      {!isClosed && (
        <form onSubmit={handleUrlSubmit} className="fade-up delay-100" style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Or paste Google Drive, OneDrive, or direct links (comma-separated)"
            className="field"
            style={{ flex: 1 }}
            disabled={uploading}
          />
          <button type="submit" disabled={uploading || !urlInput.trim()} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Fetch Links
          </button>
        </form>
      )}

      {/* Candidates table with Candidate Name Search Filter */}
      <div className="card fade-up delay-150" style={{ overflow: 'hidden' }}>
        {/* Table header with Search filter */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--c-border)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-t1)', margin: 0 }}>
              {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
            </h2>
            {searchQuery && (
              <span style={{ fontSize: '0.75rem', color: 'var(--c-t3)' }}>
                Showing {filteredCandidates.length} matching "{searchQuery}"
              </span>
            )}
          </div>

          {/* Candidate Search Input Filter */}
          <div style={{ position: 'relative', minWidth: 260, flex: '0 1 320px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--c-t3)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name or file..."
              className="field"
              style={{
                paddingLeft: 32,
                paddingRight: searchQuery ? 30 : 12,
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: '0.8125rem',
                height: 34,
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="btn-icon"
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: 4,
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Candidate List */}
        {filteredCandidates.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--c-t3)' }}>
            {searchQuery ? (
              <p style={{ margin: 0 }}>No candidates found matching "<strong>{searchQuery}</strong>".</p>
            ) : (
              <p style={{ margin: 0 }}>No candidates screened yet. Upload resumes to evaluate.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredCandidates.map((c, idx) => (
              <Link
                key={c.id}
                to={`/jobs/${id}/candidates/${c.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: idx < filteredCandidates.length - 1 ? '1px solid var(--c-border)' : 'none',
                  textDecoration: 'none',
                  background: 'transparent',
                  transition: 'background 120ms var(--ease-spring)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--c-t3)', width: 24 }}>
                    #{idx + 1}
                  </span>
                  <StatusIcon status={c.status} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.9375rem', fontWeight: 600, color: 'var(--c-t1)', margin: '0 0 2px 0',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
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
                  {c.status === 'failed' && (
                    <span className="badge badge-reject" style={{ fontSize: '0.7rem' }}>
                      Failed
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'evaluated') {
    return <CheckCircle size={18} style={{ color: 'var(--c-green)', flexShrink: 0 }} />
  }
  if (status === 'failed') {
    return <XCircle size={18} style={{ color: 'var(--c-red)', flexShrink: 0 }} />
  }
  return <Clock size={18} style={{ color: 'var(--c-amber)', flexShrink: 0 }} />
}

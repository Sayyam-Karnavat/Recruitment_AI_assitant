import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'
import {
  Loader2, ChevronLeft, Download, CheckCircle, XCircle, Clock, Trash2,
  Power, Search, X, Share2, CreditCard, Sparkles, UploadCloud, FileText,
  Users, Award, TrendingUp, Check, ExternalLink, Link2, Copy, Filter,
  ChevronDown, ChevronUp, Pencil, AlertTriangle
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
  min_passing_score?: number
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
  error_type?: string | null
  error_reason?: string | null
  created_at: string
}

function getRecommendationBadge(rec: string | null, status?: string) {
  if (status === 'failed') {
    return <span className="badge badge-reject">Invalid / Rejected</span>
  }
  switch (rec) {
    case 'Strong Shortlist':
      return <span className="badge badge-strong">Strong Match</span>
    case 'Shortlist':
      return <span className="badge badge-shortlist">Shortlisted</span>
    case 'Maybe':
      return <span className="badge badge-maybe">Potential</span>
    case 'Reject':
      return <span className="badge badge-reject">Not Selected</span>
    default:
      if (status === 'pending') {
        return <span className="badge badge-silver">Queued</span>
      }
      return <span className="badge badge-silver">Evaluating</span>
  }
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshBalance, openWalletModal, isUnlimited } = useWallet()

  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeTab, setActiveTab] = useState<'candidates' | 'upload'>('candidates')
  const [isDescExpanded, setIsDescExpanded] = useState(false)

  // Edit Job State
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTargetCount, setEditTargetCount] = useState<number | ''>(10)
  const [editMinPassingScore, setEditMinPassingScore] = useState<number | ''>(50)
  const [editCustomPrompt, setEditCustomPrompt] = useState('')
  const [editActiveDaysLimit, setEditActiveDaysLimit] = useState<number | ''>('')
  const [editMaxApplications, setEditMaxApplications] = useState<number | ''>('')
  const [editStatus, setEditStatus] = useState<string>('active')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const handleOpenEdit = () => {
    if (!job) return
    setEditTitle(job.title)
    setEditDescription(job.description)
    setEditTargetCount(job.target_shortlist_count)
    setEditMinPassingScore(job.min_passing_score ?? 50)
    setEditCustomPrompt(job.custom_prompt || '')
    setEditActiveDaysLimit(job.active_days_limit ?? '')
    setEditMaxApplications(job.max_applications ?? '')
    setEditStatus(job.status)
    setEditError('')
    setShowEdit(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')

    const cleanTitle = editTitle.trim()
    const cleanDesc = editDescription.trim()

    if (!cleanTitle) {
      setEditError('Job title is required.')
      return
    }
    if (cleanDesc.length < 10) {
      setEditError('Job description must be at least 10 characters.')
      return
    }
    if (editTargetCount !== '' && (Number(editTargetCount) < 1 || Number(editTargetCount) > 500)) {
      setEditError('Target shortlists must be between 1 and 500.')
      return
    }
    if (editMinPassingScore !== '' && (Number(editMinPassingScore) < 1 || Number(editMinPassingScore) > 100)) {
      setEditError('Passing score must be between 1 and 100.')
      return
    }
    if (editActiveDaysLimit !== '' && (Number(editActiveDaysLimit) < 1 || Number(editActiveDaysLimit) > 365)) {
      setEditError('Active days limit must be between 1 and 365 days.')
      return
    }
    if (editMaxApplications !== '' && (Number(editMaxApplications) < 1 || Number(editMaxApplications) > 50000)) {
      setEditError('Max applications must be between 1 and 50,000.')
      return
    }

    setIsSavingEdit(true)
    try {
      const res = await api.patch(`/jobs/${id}`, {
        title: cleanTitle,
        description: cleanDesc,
        target_shortlist_count: editTargetCount === '' ? 10 : Number(editTargetCount),
        min_passing_score: editMinPassingScore === '' ? 50 : Number(editMinPassingScore),
        custom_prompt: editCustomPrompt.trim() || null,
        active_days_limit: editActiveDaysLimit === '' ? null : Number(editActiveDaysLimit),
        max_applications: editMaxApplications === '' ? null : Number(editMaxApplications),
        status: editStatus,
      })
      setJob(res.data)
      setShowEdit(false)
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Failed to update position.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`)
      setJob(res.data)
    } catch (err) {
      console.error('Failed to fetch job:', err)
    }
  }

  const fetchCandidates = async () => {
    try {
      const res = await api.get(`/jobs/${id}/candidates`)
      setCandidates(res.data)
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
    }
  }

  const downloadReport = async (format: 'csv' | 'pdf') => {
    try {
      const res = await api.get(`/jobs/${id}/export/${format}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${job?.title.replace(/\s+/g, '_')}_evaluation_report.${format}`)
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

  const [deleting, setDeleting] = useState(false)

  const deleteJob = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this position? All candidates, resumes, and evaluations will be deleted.')) return
    try {
      setDeleting(true)
      await api.delete(`/jobs/${id}`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Failed to delete job', err)
      navigate('/dashboard', { replace: true })
    }
  }

  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null)

  const handleDeleteCandidate = async (e: React.MouseEvent, candidateId: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete candidate "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingCandidateId(candidateId)
      await api.delete(`/candidates/${candidateId}`)
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId))
      setJob((prev) => (prev ? { ...prev, candidate_count: Math.max(0, (prev.candidate_count || 1) - 1) } : prev))
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete candidate.')
    } finally {
      setDeletingCandidateId(null)
    }
  }

  const publicApplyUrl = `${window.location.origin}/careers/${id}`

  const copyPublicApplyLink = () => {
    navigator.clipboard.writeText(publicApplyUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  useEffect(() => {
    Promise.all([fetchJob(), fetchCandidates()]).finally(() => setLoading(false))
  }, [id])

  // Real-time WebSocket connection
  useEffect(() => {
    if (!id) return
    let wsUrl: string
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl && apiUrl.startsWith('http')) {
      try {
        const parsedUrl = new URL(apiUrl)
        const protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${parsedUrl.host}/ws/jobs/${id}`
      } catch {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}/ws/jobs/${id}`
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws/jobs/${id}`
    }
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(wsUrl)
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
            setUploadError(data.error || 'Batch processing encountered an issue.')
          }
        } catch (err) {
          console.error('WebSocket parse error:', err)
        }
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

  // Polling fallback during active uploads
  useEffect(() => {
    if (!batchId) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${id}/batch/${batchId}`)
        setBatchProgress({ processed: res.data.processed_files, total: res.data.total_files })
        fetchCandidates()
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
    }, 1500)
    return () => clearInterval(interval)
  }, [batchId, id, refreshBalance])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null)
    if (acceptedFiles.length === 0) return

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    for (const f of acceptedFiles) {
      if (f.size > MAX_FILE_SIZE) {
        setUploadError(`"${f.name}" exceeds the maximum size limit of 10 MB.`)
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
      setActiveTab('candidates')
      fetchCandidates()
      fetchJob()
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Resume upload failed'
      setUploadError(detail)
      setUploading(false)
      fetchCandidates()
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
      setActiveTab('candidates')
      fetchCandidates()
      fetchJob()
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Link ingestion failed'
      setUploadError(detail)
      setUploading(false)
      fetchCandidates()
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

  // Filter candidates by search query and recommendation category
  const filteredCandidates = useMemo(() => {
    let result = candidates
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'Reject') {
        result = result.filter(c => c.recommendation === 'Reject' || c.status === 'failed')
      } else {
        result = result.filter(c => c.recommendation === selectedFilter)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(c => {
        const nameMatch = c.name?.toLowerCase().includes(q)
        const fileMatch = c.filename?.toLowerCase().includes(q)
        const reasonMatch = c.error_reason?.toLowerCase().includes(q)
        return nameMatch || fileMatch || reasonMatch
      })
    }
    return result
  }, [candidates, searchQuery, selectedFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = candidates.length
    const evaluated = candidates.filter(c => c.status === 'evaluated')
    const strongMatches = candidates.filter(c => c.recommendation === 'Strong Shortlist').length
    const shortlists = candidates.filter(c => c.recommendation === 'Shortlist').length
    const avgScore = evaluated.length > 0
      ? Math.round(evaluated.reduce((acc, c) => acc + (c.overall_score || 0), 0) / evaluated.length)
      : 0

    return { total, evaluated: evaluated.length, strongMatches, shortlists, avgScore }
  }, [candidates])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-9 h-9 text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading position details...</p>
      </div>
    )
  }

  const isClosed = job?.status === 'closed'
  const progressPct = batchProgress.total ? (batchProgress.processed / batchProgress.total) * 100 : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Positions
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Candidate Apply Link Button */}
          <button
            onClick={copyPublicApplyLink}
            className="btn btn-primary"
            title="Copy public candidate application link"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Link Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copy Application Link</span>
              </>
            )}
          </button>

          {/* Export Actions */}
          {candidates.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadReport('csv')}
                className="btn btn-secondary text-xs"
                title="Download CSV report"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => downloadReport('pdf')}
                className="btn btn-secondary text-xs"
                title="Download PDF report"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          )}

          {/* Edit Position Button */}
          <button
            onClick={handleOpenEdit}
            className="btn btn-secondary text-xs"
            title="Edit position requirements, passing score, or limits"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Position</span>
          </button>

          {/* Toggle Active / Close */}
          <button
            onClick={toggleJobStatus}
            className={`btn text-xs ${job?.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
          >
            <Power className="w-3.5 h-3.5" />
            {job?.status === 'active' ? 'Close Position' : 'Reactivate'}
          </button>

          {/* Delete Button */}
          <button
            onClick={deleteJob}
            disabled={deleting}
            className="btn btn-danger text-xs"
            title="Delete this position permanently"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Position Header Banner */}
      <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-50 to-transparent rounded-full pointer-events-none -mr-20 -mt-20 opacity-60" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`badge ${job?.status === 'active' ? 'badge-blue' : 'badge-reject'}`}>
                {job?.status.toUpperCase()}
              </span>
              <span className="badge badge-silver">
                Target: {job?.target_shortlist_count} Shortlists
              </span>
              <span className="badge badge-silver">
                Passing Score: {job?.min_passing_score ?? 50}/100
              </span>
              {job?.active_days_limit && (
                <span className="badge badge-silver">
                  Window: {job.active_days_limit} Days
                </span>
              )}
              {job?.max_applications && (
                <span className="badge badge-silver">
                  Cap: {job.max_applications} Apps
                </span>
              )}
              <span className="text-xs text-slate-400">
                Created {job?.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {job?.title}
            </h1>

            <div className="space-y-1.5">
              <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-wrap transition-all ${
                !isDescExpanded ? 'line-clamp-3' : ''
              }`}>
                {job?.description}
              </p>
              {job?.description && job.description.length > 160 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1 transition-colors"
                >
                  <span>{isDescExpanded ? 'See less' : 'See more...'}</span>
                  {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {job?.custom_prompt && (
              <div className="inline-flex items-center gap-2 p-2.5 px-3 rounded-lg bg-brand-50/60 border border-brand-100 text-xs text-brand-900 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span><strong>Special AI Evaluation Criteria:</strong> {job.custom_prompt}</span>
              </div>
            )}
          </div>

          {/* Public Share Link Card */}
          <div className="w-full md:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-brand-600" /> Share Application Link
              </span>
              <a
                href={publicApplyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                Preview <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
              <input
                type="text"
                readOnly
                value={publicApplyUrl}
                className="text-xs text-slate-600 bg-transparent flex-1 border-none focus:outline-none select-all font-mono"
              />
              <button
                onClick={copyPublicApplyLink}
                className="p-1.5 rounded text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Share this link across job boards, social media, or with candidates. Applicants can submit directly without login.
            </p>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Candidates</p>
            <p className="text-2xl font-extrabold text-slate-900">{metrics.total}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Strong Matches</p>
            <p className="text-2xl font-extrabold text-emerald-600">{metrics.strongMatches}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Shortlisted</p>
            <p className="text-2xl font-extrabold text-brand-600">{metrics.shortlists}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Match</p>
            <p className="text-2xl font-extrabold text-slate-900">{metrics.avgScore > 0 ? `${metrics.avgScore}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-red-800">{uploadError}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isUnlimited && uploadError.toLowerCase().includes('credit') && (
              <button
                onClick={openWalletModal}
                className="btn btn-primary text-xs py-1.5 px-3"
              >
                <CreditCard className="w-3.5 h-3.5" /> Top Up Wallet
              </button>
            )}
            <button
              onClick={() => setUploadError(null)}
              className="text-xs font-semibold text-red-700 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tabs & Candidate Management Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'candidates'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Candidates & Rankings ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'upload'
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Bulk Upload & Drive Links
          </button>
        </div>

        {activeTab === 'candidates' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {(['all', 'Strong Shortlist', 'Shortlist', 'Maybe', 'Reject'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    selectedFilter === filter
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'Strong Shortlist' ? 'Strong' : filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name..."
                className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload View Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-brand-500 bg-brand-50/50'
                : isClosed
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50/50 shadow-sm'
            }`}
          >
            <input {...getInputProps({ disabled: isClosed || uploading })} />
            {uploading ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    AI Screening in Progress: {batchProgress.processed} / {batchProgress.total} resumes processed
                  </p>
                  <p className="text-xs text-slate-500">
                    Extracting structured credentials, ranking relevance, and evaluating criteria...
                  </p>
                </div>
                <div className="w-72 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900">
                    {isClosed ? 'Job is closed (Uploads disabled)' : 'Drop resume files here or click to browse'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports <strong>PDF, DOCX, or ZIP batches</strong> (up to 10MB per file) • Zero disk storage
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* URL / Cloud Drive Ingestion */}
          {!isClosed && (
            <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand-600" />
                Ingest from Cloud Links (Google Drive, OneDrive, Dropbox, or Direct URLs)
              </h3>
              <form onSubmit={handleUrlSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste public PDF URLs or cloud storage links (comma separated)"
                  className="field flex-1 text-xs"
                  disabled={uploading}
                />
                <button
                  type="submit"
                  disabled={uploading || !urlInput.trim()}
                  className="btn btn-primary text-xs px-5"
                >
                  Fetch & Screen Links
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Candidate List Table */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Live Processing Banner while batch is in progress */}
          {uploading && (
            <div className="p-4 rounded-xl bg-brand-50/80 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin flex-shrink-0" />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-brand-900">
                    AI Screening in progress ({batchProgress.processed} / {batchProgress.total} documents processed)
                  </p>
                  <p className="text-[11px] text-brand-700 truncate">
                    Parsing credentials, evaluating criteria, and updating candidate rankings in real-time...
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-48 bg-brand-100 rounded-full h-2 overflow-hidden border border-brand-200 flex-shrink-0">
                <div
                  className="h-full bg-brand-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="card bg-white border border-slate-200 shadow-sm overflow-hidden rounded-xl">
            {filteredCandidates.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery || selectedFilter !== 'all' ? 'No candidates matching your filter.' : 'No candidates screened yet.'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || selectedFilter !== 'all'
                    ? 'Try clearing the search query or selecting a different status filter.'
                    : 'Share your application link or upload resume files to begin AI screening.'}
                </p>
                {!searchQuery && selectedFilter === 'all' && (
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="btn btn-primary text-xs mt-2"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload Resumes Now
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCandidates.map((c, idx) => (
                  <Link
                    key={c.id}
                    to={`/jobs/${id}/candidates/${c.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 hover:bg-slate-50/80 transition-colors group text-decoration-none"
                  >
                    {/* Left Column: Rank, Avatar, Name, File & Rejection Reason */}
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors mt-0.5 sm:mt-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                            {c.name || c.filename}
                          </p>
                          {c.status === 'evaluated' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          ) : c.status === 'failed' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.filename}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex-shrink-0">{new Date(c.created_at).toLocaleDateString()}</span>
                        </p>

                        {/* Explicit Row Reason if Candidate was Rejected or Document was Invalid */}
                        {c.error_reason && (
                          <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-medium text-rose-700">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
                            <span className="leading-tight">{c.error_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Score, Recommendation Badge & Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {getRecommendationBadge(c.recommendation, c.status)}

                        {c.overall_score !== null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-14 h-2 bg-slate-100 rounded-full overflow-hidden hidden md:block">
                              <div
                                className={`h-full rounded-full ${
                                  c.overall_score >= 75
                                    ? 'bg-emerald-500'
                                    : c.overall_score >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${c.overall_score}%` }}
                              />
                            </div>
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                              c.overall_score >= 75
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.overall_score >= 50
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {c.overall_score}/100
                            </span>
                          </div>
                        ) : c.status === 'failed' ? (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            0/100 (Rejected)
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          <span>View</span> &rarr;
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCandidate(e, c.id, c.name || c.filename)}
                          disabled={deletingCandidateId === c.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                          title="Delete candidate record"
                        >
                          {deletingCandidateId === c.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Edit Job Modal */}
      {showEdit && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 w-full max-w-xl shadow-2xl fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Position & Filters</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update role requirements, passing score, active days, and application caps.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="field"
                  placeholder="e.g. Senior Backend Engineer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Job Description & Requirements *
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="field min-h-[140px]"
                  placeholder="Paste key responsibilities, frameworks, and qualifications..."
                  required
                  minLength={10}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom AI Evaluation Prompt (Optional)
                </label>
                <textarea
                  value={editCustomPrompt}
                  onChange={(e) => setEditCustomPrompt(e.target.value)}
                  className="field min-h-[80px]"
                  placeholder="e.g. Give heavy weight to candidates who built high-throughput microservices in Python/Go."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Shortlists
                  </label>
                  <input
                    type="number"
                    value={editTargetCount}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditTargetCount(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    max={500}
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" title="Auto-reject candidates scoring below this score out of 100">
                    Passing Score (0-100)
                  </label>
                  <input
                    type="number"
                    value={editMinPassingScore}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditMinPassingScore(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    max={100}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" title="Extend or modify the active days window">
                    Active Days Limit
                  </label>
                  <input
                    type="number"
                    value={editActiveDaysLimit}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditActiveDaysLimit(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" title="Extend or modify maximum application cap">
                    Max Applications
                  </label>
                  <input
                    type="number"
                    value={editMaxApplications}
                    onChange={(e) => {
                      const val = e.target.value
                      setEditMaxApplications(val === '' ? '' : parseInt(val, 10))
                    }}
                    className="field"
                    min={1}
                    placeholder="e.g. 150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Position Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="field text-xs"
                >
                  <option value="active">Active (Accepting Applications)</option>
                  <option value="closed">Closed (No New Applications)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="btn btn-primary"
                >
                  {isSavingEdit && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSavingEdit ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

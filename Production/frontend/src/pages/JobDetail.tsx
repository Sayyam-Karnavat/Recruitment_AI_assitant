import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../services/api'
import { Upload, Loader2, ArrowLeft, Download, CheckCircle, XCircle, Clock } from 'lucide-react'

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

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0 })

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

  // Poll batch progress
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
    if (acceptedFiles.length === 0) return
    setUploading(true)

    const formData = new FormData()
    acceptedFiles.forEach((f) => formData.append('files', f))

    try {
      const res = await api.post(`/jobs/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBatchId(res.data.batch_id)
      setBatchProgress({ processed: 0, total: res.data.total_files })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Upload failed')
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

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'evaluated': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  if (!job) return <p className="text-slate-500">Job not found.</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{job.title}</h1>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-2xl">{job.description.slice(0, 200)}...</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/jobs/${id}/export/csv`} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> CSV
            </a>
            <a href={`/api/jobs/${id}/export/pdf`} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> PDF
            </a>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-white hover:border-primary/50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              Processing... {batchProgress.processed}/{batchProgress.total} files
            </p>
            <div className="w-48 h-2 bg-slate-100 rounded-full mx-auto mt-3">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${batchProgress.total ? (batchProgress.processed / batchProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Drop resumes here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or ZIP • No file limit</p>
          </div>
        )}
      </div>

      {/* Candidates Table */}
      {candidates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">{candidates.length} Candidates</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {candidates.map((c, idx) => (
              <Link
                key={c.id}
                to={`/jobs/${id}/candidates/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400 w-6">#{idx + 1}</span>
                  {getStatusIcon(c.status)}
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.name || c.filename}</p>
                    <p className="text-xs text-slate-400">{c.filename}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.recommendation && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.recommendation === 'Strong Shortlist' ? 'bg-green-100 text-green-700' :
                      c.recommendation === 'Shortlist' ? 'bg-blue-100 text-blue-700' :
                      c.recommendation === 'Maybe' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {c.recommendation}
                    </span>
                  )}
                  {c.overall_score !== null && (
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded ${getScoreColor(c.overall_score)}`}>
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

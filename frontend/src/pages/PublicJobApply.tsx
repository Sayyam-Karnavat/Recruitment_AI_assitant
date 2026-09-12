import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Briefcase, UploadCloud, CheckCircle2, AlertCircle, ArrowLeft, FileText, Sparkles, Loader2 } from 'lucide-react'
import api from '../services/api'

interface PublicJob {
  id: string
  title: string
  description: string
  target_shortlist_count: number
  status: string
  created_at: string
}

export default function PublicJobApply() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [successData, setSuccessData] = useState<{ message: string; candidate_id: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    loadJob()
  }, [jobId])

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      const ext = selected.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pdf' && ext !== 'docx') {
        setErrorMsg('Please select a valid PDF or DOCX resume document.')
        return
      }
      setFile(selected)
      setErrorMsg(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !jobId) return

    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessData(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post(`/public/jobs/${jobId}/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccessData(res.data)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit resume. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--c-t3)' }}>
          <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
          <p>Loading job opening...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertCircle size={24} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--c-t1)', margin: '0 0 8px' }}>
          Job Not Found
        </h2>
        <p style={{ color: 'var(--c-t3)', marginBottom: 20 }}>
          {errorMsg || 'This job opening does not exist or has already been closed.'}
        </p>
        <Link to="/" className="btn btn-secondary">
          Return to Home
        </Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-base)', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Navigation / Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <Link
            to="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--c-t3)', textDecoration: 'none', fontSize: '0.875rem' }}
          >
            <ArrowLeft size={16} /> All Careers
          </Link>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--c-t1)' }}>
            ResumeAI Careers
          </span>
        </div>

        {/* Job Header Card */}
        <div
          className="glass card"
          style={{
            padding: '32px',
            marginBottom: 28,
            borderRadius: 16,
            border: '1px solid var(--c-border)',
            background: 'var(--c-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge badge-green" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  {job.status}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-t3)' }}>
                  Target shortlist: {job.target_shortlist_count} positions
                </span>
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--c-t1)', margin: 0 }}>
                {job.title}
              </h1>
            </div>

            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--c-border)', margin: '24px 0' }} />

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-t1)', marginBottom: 12 }}>
              Job Description & Requirements
            </h3>
            <div style={{ color: 'var(--c-t2)', fontSize: '0.925rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {job.description}
            </div>
          </div>
        </div>

        {/* Application Submission Section */}
        <div
          className="glass card"
          style={{
            padding: '32px',
            borderRadius: 16,
            border: '1px solid var(--c-border)',
            background: 'var(--c-surface)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-t1)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} style={{ color: '#3b82f6' }} /> Apply for this Role
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--c-t3)' }}>
            Upload your resume (PDF or DOCX). Our AI screening engine will parse your experience and score your qualifications against the job criteria.
          </p>

          {successData ? (
            <div
              style={{
                padding: '24px',
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                textAlign: 'center',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 22, background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 700, color: '#10b981' }}>
                Application Submitted Successfully!
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '0.875rem', color: 'var(--c-t2)' }}>
                {successData.message}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-t3)', fontFamily: 'monospace' }}>
                Application Reference ID: {successData.candidate_id}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* File upload zone */}
              <div
                style={{
                  border: '2px dashed var(--c-border)',
                  borderRadius: 12,
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: file ? 'rgba(59, 130, 246, 0.04)' : 'var(--c-base)',
                  cursor: 'pointer',
                  marginBottom: 20,
                  transition: 'border-color 0.2s ease',
                }}
                onClick={() => document.getElementById('publicResumeInput')?.click()}
              >
                <input
                  type="file"
                  id="publicResumeInput"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div>
                    <FileText size={36} style={{ color: '#3b82f6', margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-t1)' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-t3)', marginTop: 4 }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to change file
                    </div>
                  </div>
                ) : (
                  <div>
                    <UploadCloud size={36} style={{ color: 'var(--c-t3)', margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-t1)' }}>
                      Click to upload your resume
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-t3)', marginTop: 4 }}>
                      Supported formats: PDF, DOCX (Max 5MB, up to 10 pages)
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontSize: '0.825rem',
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || isSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Analyzing & Submitting Resume...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

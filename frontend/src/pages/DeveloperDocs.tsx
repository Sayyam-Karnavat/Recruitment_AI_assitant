import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Code2, Key, Terminal, Send, Check, Copy, Shield, BookOpen,
  Webhook, Cpu, AlertCircle, Sparkles, ExternalLink
} from 'lucide-react'

type Language = 'curl' | 'python' | 'javascript'

export default function DeveloperDocs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState<Language>('curl')

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(id)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const baseUrl = window.location.origin

  const codeSnippets = {
    createJob: {
      curl: `curl -X POST "${baseUrl}/v1/jobs" \\
  -H "X-API-Key: rk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Senior Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    "target_shortlist_count": 10,
    "webhook_url": "https://api.yourcompany.com/webhooks/resumes",
    "custom_prompt": "Prioritize candidates with strong distributed systems design."
  }'`,
      python: `import requests

url = "${baseUrl}/v1/jobs"
headers = {
    "X-API-Key": "rk_live_your_api_key_here",
    "Content-Type": "application/json"
}
payload = {
    "title": "Senior Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    "target_shortlist_count": 10,
    "webhook_url": "https://api.yourcompany.com/webhooks/resumes",
    "custom_prompt": "Prioritize candidates with strong distributed systems design."
}

response = requests.post(url, json=payload, headers=headers)
job = response.json()
print("Created Job ID:", job["id"])`,
      javascript: `const response = await fetch("${baseUrl}/v1/jobs", {
  method: "POST",
  headers: {
    "X-API-Key": "rk_live_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Senior Backend Engineer",
    description: "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    target_shortlist_count: 10,
    webhook_url: "https://api.yourcompany.com/webhooks/resumes",
    custom_prompt: "Prioritize candidates with strong distributed systems design."
  })
});

const job = await response.json();
console.log("Created Job ID:", job.id);`
    },
    uploadResumes: {
      curl: `curl -X POST "${baseUrl}/v1/jobs/YOUR_JOB_ID/upload" \\
  -H "X-API-Key: rk_live_your_api_key_here" \\
  -F "files=@/path/to/candidate_resume.pdf" \\
  -F "files=@/path/to/batch_resumes.zip"`,
      python: `import requests

url = "${baseUrl}/v1/jobs/YOUR_JOB_ID/upload"
headers = {
    "X-API-Key": "rk_live_your_api_key_here"
}
files = [
    ("files", ("resume1.pdf", open("candidate1.pdf", "rb"), "application/pdf")),
    ("files", ("resumes.zip", open("resumes.zip", "rb"), "application/zip"))
]

response = requests.post(url, headers=headers, files=files)
print(response.json())
# Output: {"batch_id": "...", "total_files": 12, "message": "Processing started"}`,
      javascript: `const formData = new FormData();
formData.append("files", fileInput.files[0]);

const response = await fetch("${baseUrl}/v1/jobs/YOUR_JOB_ID/upload", {
  method: "POST",
  headers: {
    "X-API-Key": "rk_live_your_api_key_here"
  },
  body: formData
});

const result = await response.json();
console.log("Batch ID:", result.batch_id);`
    },
    getCandidate: {
      curl: `curl -X GET "${baseUrl}/v1/candidates/YOUR_CANDIDATE_ID" \\
  -H "X-API-Key: rk_live_your_api_key_here"`,
      python: `import requests

url = "${baseUrl}/v1/candidates/YOUR_CANDIDATE_ID"
headers = {
    "X-API-Key": "rk_live_your_api_key_here"
}

response = requests.get(url, headers=headers)
candidate = response.json()

print(f"Candidate: {candidate['profile']['name']}")
print(f"Overall Score: {candidate['evaluation']['overall_score']}/100")
print(f"Recommendation: {candidate['evaluation']['recommendation']}")`,
      javascript: `const response = await fetch("${baseUrl}/v1/candidates/YOUR_CANDIDATE_ID", {
  headers: {
    "X-API-Key": "rk_live_your_api_key_here"
  }
});

const candidate = await response.json();
console.log("Candidate Name:", candidate.profile.name);
console.log("AI Score:", candidate.evaluation.overall_score);`
    }
  }

  const webhookPayloadSample = `{
  "event": "candidate.evaluated",
  "candidate_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "job_id": "a4d8c82b-6320-4328-98fe-0ef9b7c8df29",
  "name": "Sarah Jenkins",
  "overall_score": 92,
  "recommendation": "Strong Hire",
  "status": "evaluated"
}`

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '28px 32px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.08))',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#3b82f6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Code2 size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--c-t1)' }}>
              Developer API Documentation
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--c-t3)' }}>
              Integrate AI-powered resume screening, ranking, and evaluations into your ATS or internal workflows.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <Link to="/settings" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Key size={16} /> Manage API Keys in Settings
          </Link>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ExternalLink size={16} /> Interactive OpenAPI Explorer
          </a>
        </div>
      </div>

      {/* Language Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          padding: '8px 16px',
          background: 'var(--c-surface)',
          borderRadius: 10,
          border: '1px solid var(--c-border)',
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Terminal size={16} /> Code Examples Language:
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['curl', 'python', 'javascript'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                border: selectedLang === lang ? '1px solid #3b82f6' : '1px solid var(--c-border)',
                background: selectedLang === lang ? '#3b82f6' : 'var(--c-surface-raised)',
                color: selectedLang === lang ? '#ffffff' : 'var(--c-t2)',
                cursor: 'pointer',
              }}
            >
              {lang === 'javascript' ? 'Node.js' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Authentication */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-t1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={20} style={{ color: '#3b82f6' }} /> 1. Authentication
        </h2>
        <div className="glass card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--c-t2)', lineHeight: 1.6 }}>
            Every request to the <code style={{ color: '#3b82f6' }}>/v1/*</code> endpoints must include your API key in the <code style={{ color: '#3b82f6' }}>X-API-Key</code> request header.
          </p>

          <div style={{ padding: '12px 16px', background: 'var(--c-base)', borderRadius: 8, border: '1px solid var(--c-border)', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--c-t1)' }}>
            X-API-Key: rk_live_a1b2c3d4e5f6...
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
            <AlertCircle size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--c-t2)', lineHeight: 1.5 }}>
              <strong>Important:</strong> Keep your API keys confidential. Do not expose them in client-side code or public repositories. You can revoke and generate new keys anytime in <Link to="/settings" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Settings</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Endpoints */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-t1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BookOpen size={20} style={{ color: '#3b82f6' }} /> 2. API Endpoints
        </h2>

        {/* Endpoint 1: Create Job */}
        <div className="glass card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>POST</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--c-t1)' }}>/v1/jobs</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--c-t2)' }}>
            Create a new job posting position with evaluation criteria, custom prompts, and optional webhook notification URL.
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: '16px', borderRadius: 8, background: 'var(--c-base)', border: '1px solid var(--c-border)', overflowX: 'auto', fontSize: '0.825rem', color: 'var(--c-t1)' }}>
              <code>{codeSnippets.createJob[selectedLang]}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.createJob[selectedLang], 'createJob')}
              className="btn-icon"
              style={{ position: 'absolute', top: 10, right: 10, background: 'var(--c-surface)' }}
              title="Copy snippet"
            >
              {copiedSection === 'createJob' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Endpoint 2: Upload Resumes */}
        <div className="glass card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: '#10b981', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>POST</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--c-t1)' }}>/v1/jobs/{'{job_id}'}/upload</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--c-t2)' }}>
            Upload single or bulk candidate resumes (PDF, DOCX, ZIP archives). Files are streamed to memory, parsed, evaluated, and immediately discarded with zero disk retention.
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: '16px', borderRadius: 8, background: 'var(--c-base)', border: '1px solid var(--c-border)', overflowX: 'auto', fontSize: '0.825rem', color: 'var(--c-t1)' }}>
              <code>{codeSnippets.uploadResumes[selectedLang]}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.uploadResumes[selectedLang], 'uploadResumes')}
              className="btn-icon"
              style={{ position: 'absolute', top: 10, right: 10, background: 'var(--c-surface)' }}
              title="Copy snippet"
            >
              {copiedSection === 'uploadResumes' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Endpoint 3: Get Candidate */}
        <div className="glass card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>GET</span>
            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--c-t1)' }}>/v1/candidates/{'{candidate_id}'}</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--c-t2)' }}>
            Fetch complete evaluation breakdown: overall score (0-100), recommendation, structured profile (work history, skills, education), and category scores.
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: '16px', borderRadius: 8, background: 'var(--c-base)', border: '1px solid var(--c-border)', overflowX: 'auto', fontSize: '0.825rem', color: 'var(--c-t1)' }}>
              <code>{codeSnippets.getCandidate[selectedLang]}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(codeSnippets.getCandidate[selectedLang], 'getCandidate')}
              className="btn-icon"
              style={{ position: 'absolute', top: 10, right: 10, background: 'var(--c-surface)' }}
              title="Copy snippet"
            >
              {copiedSection === 'getCandidate' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Webhooks */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-t1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Webhook size={20} style={{ color: '#3b82f6' }} /> 3. Real-Time Webhooks
        </h2>
        <div className="glass card" style={{ padding: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--c-t2)', lineHeight: 1.6 }}>
            Instead of polling for results, configure a <code style={{ color: '#3b82f6' }}>webhook_url</code> when creating a job. As soon as the AI completes evaluation for any candidate, our worker dispatches an HTTP POST event to your webhook:
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{ margin: 0, padding: '16px', borderRadius: 8, background: 'var(--c-base)', border: '1px solid var(--c-border)', overflowX: 'auto', fontSize: '0.825rem', color: 'var(--c-t1)' }}>
              <code>{webhookPayloadSample}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(webhookPayloadSample, 'webhook')}
              className="btn-icon"
              style={{ position: 'absolute', top: 10, right: 10, background: 'var(--c-surface)' }}
              title="Copy payload"
            >
              {copiedSection === 'webhook' ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Wallet & Pricing Guardrails */}
      <section>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--c-t1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Cpu size={20} style={{ color: '#3b82f6' }} /> 4. Credit Billing & System Guardrails
        </h2>
        <div className="glass card" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-t1)', marginBottom: 6 }}>
                💳 Simple Pricing
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--c-t3)', lineHeight: 1.5 }}>
                1 Credit = 1 Resume Screened. Standard package is ₹500 for 100 Resume Credits (₹5 / resume).
              </p>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#10b981', marginBottom: 6 }}>
                🛡️ Guaranteed Refunds
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--c-t3)', lineHeight: 1.5 }}>
                If our AI engine encounters an internal timeout or server issue, your credit is <strong>automatically refunded</strong> with a logged transaction.
              </p>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--c-surface-raised)', border: '1px solid var(--c-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#eab308', marginBottom: 6 }}>
                ⚠️ Status 402 Guardrail
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--c-t3)', lineHeight: 1.5 }}>
                If your wallet balance is insufficient, API requests return <code style={{ color: '#eab308' }}>HTTP 402 Payment Required</code> before any files are processed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

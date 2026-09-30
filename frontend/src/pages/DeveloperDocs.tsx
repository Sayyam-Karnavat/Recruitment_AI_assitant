import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Code2, Key, Terminal, Send, Check, Copy, Shield, BookOpen,
  Webhook, Cpu, AlertCircle, Sparkles, ExternalLink, ChevronRight,
  Layers, ArrowRight, Zap, CheckCircle2, Lock, Globe, FileText,
  Trash2, RefreshCw, BarChart3, Search
} from 'lucide-react'

type Language = 'curl' | 'python' | 'javascript'

export default function DeveloperDocs() {
  const [activeSection, setActiveSection] = useState<string>('auth')
  const [selectedLang, setSelectedLang] = useState<Language>('curl')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const baseUrl = window.location.origin

  const codeSnippets: Record<string, Record<Language, string>> = {
    auth: {
      curl: `curl -X GET "${baseUrl}/v1/jobs" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {
    "X-API-Key": "app_live_your_api_key_here"
}
response = requests.get("${baseUrl}/v1/jobs", headers=headers)
print(response.json())`,
      javascript: `const response = await fetch("${baseUrl}/v1/jobs", {
  headers: {
    "X-API-Key": "app_live_your_api_key_here"
  }
});
const data = await response.json();
console.log(data);`
    },

    createJob: {
      curl: `curl -X POST "${baseUrl}/v1/jobs" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Senior AI / Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    "target_shortlist_count": 5,
    "min_passing_score": 60,
    "custom_prompt": "Prioritize candidates with strong production LLM fine-tuning experience."
  }'`,
      python: `import requests

url = "${baseUrl}/v1/jobs"
headers = {
    "X-API-Key": "app_live_your_api_key_here",
    "Content-Type": "application/json"
}
payload = {
    "title": "Senior AI / Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    "target_shortlist_count": 5,
    "min_passing_score": 60,
    "custom_prompt": "Prioritize candidates with strong production LLM fine-tuning experience."
}

response = requests.post(url, json=payload, headers=headers)
job = response.json()
print("Created Job ID:", job["id"])`,
      javascript: `const response = await fetch("${baseUrl}/v1/jobs", {
  method: "POST",
  headers: {
    "X-API-Key": "app_live_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Senior AI / Backend Engineer",
    description: "Must have 4+ years experience with Python, FastAPI, and PostgreSQL.",
    target_shortlist_count: 5,
    min_passing_score: 60,
    custom_prompt: "Prioritize candidates with strong production LLM fine-tuning experience."
  })
});

const job = await response.json();
console.log("Created Job ID:", job.id);`
    },

    manageJob: {
      curl: `# 1. Update position settings:
curl -X PATCH "${baseUrl}/v1/jobs/JOB_ID" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Lead AI Architect", "min_passing_score": 70}'

# 2. Close position (pause applications):
curl -X POST "${baseUrl}/v1/jobs/JOB_ID/close" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 3. Reopen position:
curl -X POST "${baseUrl}/v1/jobs/JOB_ID/reopen" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 4. Permanently delete position:
curl -X DELETE "${baseUrl}/v1/jobs/JOB_ID" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here", "Content-Type": "application/json"}

# 1. Update position settings
requests.patch("${baseUrl}/v1/jobs/JOB_ID", json={"title": "Lead AI Architect", "min_passing_score": 70}, headers=headers)

# 2. Close position
requests.post("${baseUrl}/v1/jobs/JOB_ID/close", headers=headers)

# 3. Reopen position
requests.post("${baseUrl}/v1/jobs/JOB_ID/reopen", headers=headers)

# 4. Delete position
requests.delete("${baseUrl}/v1/jobs/JOB_ID", headers=headers)`,
      javascript: `// Update position
await fetch("${baseUrl}/v1/jobs/JOB_ID", {
  method: "PATCH",
  headers: { "X-API-Key": "app_live_your_api_key_here", "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Lead AI Architect", min_passing_score: 70 })
});

// Close position
await fetch("${baseUrl}/v1/jobs/JOB_ID/close", {
  method: "POST",
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});

// Reopen position
await fetch("${baseUrl}/v1/jobs/JOB_ID/reopen", {
  method: "POST",
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});

// Delete position
await fetch("${baseUrl}/v1/jobs/JOB_ID", {
  method: "DELETE",
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});`
    },

    shareLink: {
      curl: `curl -X GET "${baseUrl}/v1/jobs/JOB_ID/share-link" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here"}
res = requests.get("${baseUrl}/v1/jobs/JOB_ID/share-link", headers=headers)
print("Candidate Apply URL:", res.json()["shareable_url"])`,
      javascript: `const res = await fetch("${baseUrl}/v1/jobs/JOB_ID/share-link", {
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
const data = await res.json();
console.log("Candidate Apply URL:", data.shareable_url);`
    },

    uploadResumes: {
      curl: `curl -X POST "${baseUrl}/v1/jobs/JOB_ID/upload" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -F "files=@/path/to/resume_candidate_1.pdf" \\
  -F "files=@/path/to/batch_candidates.zip"`,
      python: `import requests

url = "${baseUrl}/v1/jobs/JOB_ID/upload"
headers = {"X-API-Key": "app_live_your_api_key_here"}

files = [
    ("files", ("resume_1.pdf", open("resume_1.pdf", "rb"), "application/pdf")),
    ("files", ("batch.zip", open("batch.zip", "rb"), "application/zip"))
]

response = requests.post(url, headers=headers, files=files)
print(response.json())
# Output: {"batch_id": "b_123", "total_files": 10, "message": "Screening initiated"}`,
      javascript: `const formData = new FormData();
formData.append("files", fileInput.files[0]);

const response = await fetch("${baseUrl}/v1/jobs/JOB_ID/upload", {
  method: "POST",
  headers: {
    "X-API-Key": "app_live_your_api_key_here"
  },
  body: formData
});

const result = await response.json();
console.log("Batch ID:", result.batch_id);`
    },

    uploadLinks: {
      curl: `curl -X POST "${baseUrl}/v1/jobs/JOB_ID/upload-links" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": [
      "https://example.com/resumes/john_doe.pdf",
      "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOp&export=download"
    ]
  }'`,
      python: `import requests

url = "${baseUrl}/v1/jobs/JOB_ID/upload-links"
headers = {
    "X-API-Key": "app_live_your_api_key_here",
    "Content-Type": "application/json"
}
payload = {
    "urls": [
        "https://example.com/resumes/john_doe.pdf",
        "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOp&export=download"
    ]
}

res = requests.post(url, json=payload, headers=headers)
print(res.json())`,
      javascript: `const res = await fetch("${baseUrl}/v1/jobs/JOB_ID/upload-links", {
  method: "POST",
  headers: {
    "X-API-Key": "app_live_your_api_key_here",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    urls: [
      "https://example.com/resumes/john_doe.pdf",
      "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOp&export=download"
    ]
  })
});
console.log(await res.json());`
    },

    candidateStatus: {
      curl: `# 1. Check application status by candidate ID:
curl -X GET "${baseUrl}/v1/candidates/CANDIDATE_ID/status" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 2. Lookup candidate scorecard by email:
curl -X GET "${baseUrl}/v1/candidates/by-email?email=candidate@example.com" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here"}

# 1. Quick status check
status_res = requests.get("${baseUrl}/v1/candidates/CANDIDATE_ID/status", headers=headers)
print("Status:", status_res.json()["status"], "Score:", status_res.json().get("overall_score"))

# 2. Email lookup across positions
email_res = requests.get("${baseUrl}/v1/candidates/by-email?email=candidate@example.com", headers=headers)
print("Candidate records:", email_res.json())`,
      javascript: `// Status check
const statusRes = await fetch("${baseUrl}/v1/candidates/CANDIDATE_ID/status", {
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
console.log(await statusRes.json());

// Email lookup
const emailRes = await fetch("${baseUrl}/v1/candidates/by-email?email=candidate@example.com", {
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
console.log(await emailRes.json());`
    },

    getCandidate: {
      curl: `# 1. Get full structured evaluation:
curl -X GET "${baseUrl}/v1/candidates/CANDIDATE_ID" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 2. Trigger instant re-screening:
curl -X POST "${baseUrl}/v1/candidates/CANDIDATE_ID/rescreen" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 3. Delete candidate:
curl -X DELETE "${baseUrl}/v1/candidates/CANDIDATE_ID" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here"}

# Get full scorecard
candidate = requests.get("${baseUrl}/v1/candidates/CANDIDATE_ID", headers=headers).json()
print(f"Name: {candidate['profile']['name']}")
print(f"Match Score: {candidate['evaluation']['overall_score']}/100")
print(f"Recommendation: {candidate['evaluation']['recommendation']}")

# Trigger re-screening
rescreen = requests.post("${baseUrl}/v1/candidates/CANDIDATE_ID/rescreen", headers=headers).json()
print("Re-screen Batch:", rescreen["batch_id"])`,
      javascript: `// Get scorecard
const res = await fetch("${baseUrl}/v1/candidates/CANDIDATE_ID", {
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
const candidate = await res.json();
console.log("Match Score:", candidate.evaluation.overall_score);

// Trigger re-screening
const reRes = await fetch("${baseUrl}/v1/candidates/CANDIDATE_ID/rescreen", {
  method: "POST",
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
console.log(await reRes.json());`
    },

    webhooks: {
      curl: `# 1. Register webhook endpoint:
curl -X POST "${baseUrl}/v1/jobs/JOB_ID/webhook" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"webhook_url": "https://your-ats.com/api/screened"}'

# 2. Inspect active webhook:
curl -X GET "${baseUrl}/v1/jobs/JOB_ID/webhook" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 3. Remove webhook:
curl -X DELETE "${baseUrl}/v1/jobs/JOB_ID/webhook" \\
  -H "X-API-Key: app_live_your_api_key_here"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here", "Content-Type": "application/json"}

# Register Webhook
requests.post("${baseUrl}/v1/jobs/JOB_ID/webhook", json={"webhook_url": "https://your-ats.com/api/screened"}, headers=headers)

# Inspect Webhook
config = requests.get("${baseUrl}/v1/jobs/JOB_ID/webhook", headers=headers).json()
print("Webhook URL:", config["webhook_url"])`,
      javascript: `// Register Webhook
await fetch("${baseUrl}/v1/jobs/JOB_ID/webhook", {
  method: "POST",
  headers: { "X-API-Key": "app_live_your_api_key_here", "Content-Type": "application/json" },
  body: JSON.stringify({ webhook_url: "https://your-ats.com/api/screened" })
});`
    },

    exportCsv: {
      curl: `# 1. Get Pipeline Intelligence Summary:
curl -X GET "${baseUrl}/v1/jobs/JOB_ID/summary" \\
  -H "X-API-Key: app_live_your_api_key_here"

# 2. Download ranked candidate scorecard CSV:
curl -X GET "${baseUrl}/v1/jobs/JOB_ID/export/csv" \\
  -H "X-API-Key: app_live_your_api_key_here" \\
  -o "shortlist_export.csv"`,
      python: `import requests

headers = {"X-API-Key": "app_live_your_api_key_here"}

# Get Pipeline Intelligence Summary
summary = requests.get("${baseUrl}/v1/jobs/JOB_ID/summary", headers=headers).json()
print(f"Total: {summary['total_candidates']} | Avg Score: {summary['average_score']}%")

# Stream CSV to file
csv_res = requests.get("${baseUrl}/v1/jobs/JOB_ID/export/csv", headers=headers)
with open("export.csv", "wb") as f:
    f.write(csv_res.content)`,
      javascript: `// Fetch summary
const sumRes = await fetch("${baseUrl}/v1/jobs/JOB_ID/summary", {
  headers: { "X-API-Key": "app_live_your_api_key_here" }
});
console.log(await sumRes.json());`
    }
  }

  const navItems = [
    { id: 'auth', label: 'Authentication', icon: Shield, group: 'Getting Started' },
    { id: 'createJob', label: 'Create Position', icon: Globe, group: 'Positions API' },
    { id: 'manageJob', label: 'Update, Close & Delete', icon: Layers, group: 'Positions API' },
    { id: 'shareLink', label: 'Get Shareable Apply Link', icon: Zap, group: 'Positions API' },
    { id: 'uploadResumes', label: 'Upload Files & ZIPs', icon: Terminal, group: 'Ingestion API' },
    { id: 'uploadLinks', label: 'Direct URL / Cloud Links', icon: Globe, group: 'Ingestion API' },
    { id: 'candidateStatus', label: 'Status & Email Lookup', icon: Search, group: 'Candidates API' },
    { id: 'getCandidate', label: 'Full Report & Re-Screen', icon: Cpu, group: 'Candidates API' },
    { id: 'webhooks', label: 'Webhooks & Notifications', icon: Webhook, group: 'Automation' },
    { id: 'exportCsv', label: 'Summary & CSV Export', icon: BookOpen, group: 'Analytics' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-shortlist">REST API v1</span>
              <span className="text-xs text-slate-400 font-mono">Enterprise Protocol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Developer API & SDK Reference
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Programmatically manage positions, stream batch resumes (PDF/DOCX/ZIP/URLs), track real-time AI scoring, and trigger automated webhook callbacks into your ATS or custom HR portal.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link to="/settings" className="btn btn-primary text-xs">
              <Key className="w-3.5 h-3.5" /> Manage API Keys
            </Link>
          </div>
        </div>
      </div>

      {/* Main Documentation Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sticky Sidebar (3 Cols) */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-20">
          <div className="card p-4 bg-white border border-slate-200 shadow-sm rounded-xl space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                API Reference
              </p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        {item.label}
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 px-2 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Authentication Header
              </p>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                X-API-Key: app_live_...
              </div>
            </div>
          </div>
        </div>

        {/* Center & Right Content Panes (9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Section: Authentication */}
          {activeSection === 'auth' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    <Shield className="w-3.5 h-3.5" /> API Security
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">API Key Authentication</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    All requests to the <code className="text-blue-600 font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">/v1/*</code> endpoints require an API Key supplied in the <code className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">X-API-Key</code> request header.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Keep your secret keys secure</p>
                    <p className="leading-relaxed">
                      Do not expose your API key in client-side code or public GitHub repositories. You can generate, name, and revoke keys at any time in your <Link to="/settings" className="underline font-bold text-blue-600">Settings dashboard</Link>.
                    </p>
                  </div>
                </div>
              </div>

              <CodeBlockPanel
                title="Example: Authenticated Request"
                snippets={codeSnippets.auth}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'auth')}
                copied={copiedKey === 'auth'}
              />
            </div>
          )}

          {/* Section: Create Job */}
          {activeSection === 'createJob' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <span className="badge badge-strong">POST</span>
                  <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs</code>
                  <p className="text-sm text-slate-600 mt-2">
                    Create a position pipeline with custom screening criteria, passing score cutoff, and optional webhook notification URLs.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-mono font-bold text-blue-600">title</td>
                        <td className="p-3 text-slate-500 font-mono">string</td>
                        <td className="p-3 text-slate-700">Job position title (e.g. "Senior Python Engineer")</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-blue-600">description</td>
                        <td className="p-3 text-slate-500 font-mono">string</td>
                        <td className="p-3 text-slate-700">Comprehensive job requirements against which resumes are evaluated.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-blue-600">min_passing_score</td>
                        <td className="p-3 text-slate-500 font-mono">integer</td>
                        <td className="p-3 text-slate-700">Cutoff threshold (1–100). Default is 50.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <CodeBlockPanel
                title="Example: Create Job Opening"
                snippets={codeSnippets.createJob}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'createJob')}
                copied={copiedKey === 'createJob'}
              />
            </div>
          )}

          {/* Section: Manage Job (Update, Close, Reopen, Delete) */}
          {activeSection === 'manageJob' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-shortlist">PATCH</span>
                    <span className="badge badge-maybe">POST</span>
                    <span className="badge badge-reject">DELETE</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Position Lifecycle Controls</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Full programmatic control over open job postings: update descriptions or thresholds, pause applications by closing, reactivate, or permanently delete.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-blue-600">PATCH /v1/jobs/{'{job_id}'}</span>
                    <p className="text-slate-600 mt-1">Dynamically update title, description, or cutoff score.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-amber-600">POST /v1/jobs/{'{job_id}'}/close</span>
                    <p className="text-slate-600 mt-1">Pause position to reject new incoming applicants.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-emerald-600">POST /v1/jobs/{'{job_id}'}/reopen</span>
                    <p className="text-slate-600 mt-1">Reopen position to resume screening candidates.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-bold text-rose-600">DELETE /v1/jobs/{'{job_id}'}</span>
                    <p className="text-slate-600 mt-1">Permanently purge job and all its candidate evaluations.</p>
                  </div>
                </div>
              </div>

              <CodeBlockPanel
                title="Example: Update, Close & Delete Position"
                snippets={codeSnippets.manageJob}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'manageJob')}
                copied={copiedKey === 'manageJob'}
              />
            </div>
          )}

          {/* Section: Shareable Link */}
          {activeSection === 'shareLink' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/share-link</code>
                <p className="text-sm text-slate-600">
                  Retrieve the live public application link for this job. Share this link on LinkedIn, Twitter, or job boards to allow candidates to apply directly.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Get Shareable Apply Link"
                snippets={codeSnippets.shareLink}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'shareLink')}
                copied={copiedKey === 'shareLink'}
              />
            </div>
          )}

          {/* Section: Upload Resumes */}
          {activeSection === 'uploadResumes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">POST</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/upload</code>
                <p className="text-sm text-slate-600">
                  Multipart file upload supporting single PDFs, Word DOCX files, or bulk ZIP archives containing up to 100+ resumes. Ingestion streams entirely in transient memory.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Upload Resumes & Bulk ZIP"
                snippets={codeSnippets.uploadResumes}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'uploadResumes')}
                copied={copiedKey === 'uploadResumes'}
              />
            </div>
          )}

          {/* Section: Direct URL / Cloud Links */}
          {activeSection === 'uploadLinks' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">POST</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/upload-links</code>
                <p className="text-sm text-slate-600">
                  Pass an array of public cloud URLs (Google Drive share links, AWS S3 presigned URLs, Dropbox, or direct PDF links). Uppshot downloads and screens them automatically.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Direct URL Ingestion"
                snippets={codeSnippets.uploadLinks}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'uploadLinks')}
                copied={copiedKey === 'uploadLinks'}
              />
            </div>
          )}

          {/* Section: Candidate Status & Email Lookup */}
          {activeSection === 'candidateStatus' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/candidates/{'{id}'}/status</code>
                <span className="badge badge-strong ml-4">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/candidates/by-email</code>
                <p className="text-sm text-slate-600">
                  Instantly verify an applicant's current screening stage (<code className="font-mono text-xs">pending</code>, <code className="font-mono text-xs">evaluating</code>, <code className="font-mono text-xs">evaluated</code>, <code className="font-mono text-xs">failed</code>) or search screening history across positions by candidate email.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Status & Email Lookup"
                snippets={codeSnippets.candidateStatus}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'candidateStatus')}
                copied={copiedKey === 'candidateStatus'}
              />
            </div>
          )}

          {/* Section: Get Evaluation Report */}
          {activeSection === 'getCandidate' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/candidates/{'{candidate_id}'}</code>
                <p className="text-sm text-slate-600">
                  Returns the complete AI scorecard: overall match score, recommendation (Strong Shortlist, Shortlist, Maybe, Reject), category scores, strengths, weaknesses, and missing skills.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Candidate Evaluation & Re-Screen"
                snippets={codeSnippets.getCandidate}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'getCandidate')}
                copied={copiedKey === 'getCandidate'}
              />
            </div>
          )}

          {/* Section: Webhooks */}
          {activeSection === 'webhooks' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">POST</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/webhook</code>
                <p className="text-sm text-slate-600">
                  Configure an HTTPS webhook URL. Uppshot delivers real-time notifications with applicant match score and recommendation as soon as screening completes.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Webhook Configuration"
                snippets={codeSnippets.webhooks}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'webhooks')}
                copied={copiedKey === 'webhooks'}
              />
            </div>
          )}

          {/* Section: CSV Export & Summary */}
          {activeSection === 'exportCsv' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
                <span className="badge badge-strong">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/summary</code>
                <span className="badge badge-strong ml-4">GET</span>
                <code className="text-base font-bold font-mono text-slate-900 ml-2">/v1/jobs/{'{job_id}'}/export/csv</code>
                <p className="text-sm text-slate-600">
                  Retrieve pipeline analytics (average score, pass/fail counts, top detected skills) or programmatically download the complete shortlist as a clean CSV stream.
                </p>
              </div>

              <CodeBlockPanel
                title="Example: Pipeline Summary & CSV Export"
                snippets={codeSnippets.exportCsv}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'exportCsv')}
                copied={copiedKey === 'exportCsv'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CodeBlockPanel({
  title,
  snippets,
  selectedLang,
  setSelectedLang,
  onCopy,
  copied,
}: {
  title: string
  snippets: Record<Language, string>
  selectedLang: Language
  setSelectedLang: (lang: Language) => void
  onCopy: (text: string) => void
  copied: boolean
}) {
  return (
    <div className="card bg-slate-900 border border-slate-800 shadow-xl rounded-2xl overflow-hidden text-white">
      {/* Code Header */}
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" /> {title}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            {(['curl', 'python', 'javascript'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono uppercase transition-colors ${
                  selectedLang === lang
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button
            onClick={() => onCopy(snippets[selectedLang])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copy snippet"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-5 overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed max-h-[460px]">
        <pre>{snippets[selectedLang]}</pre>
      </div>
    </div>
  )
}

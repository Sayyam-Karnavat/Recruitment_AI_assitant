import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Code2, Key, Terminal, Send, Check, Copy, Shield, BookOpen,
  Webhook, Cpu, AlertCircle, Sparkles, ExternalLink, ChevronRight,
  Layers, ArrowRight, Zap, CheckCircle2, Lock, Globe
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
  -H "X-API-Key: rk_live_your_api_key_here"`,
      python: `import requests

headers = {
    "X-API-Key": "rk_live_your_api_key_here"
}
response = requests.get("${baseUrl}/v1/jobs", headers=headers)
print(response.json())`,
      javascript: `const response = await fetch("${baseUrl}/v1/jobs", {
  headers: {
    "X-API-Key": "rk_live_your_api_key_here"
  }
});
const data = await response.json();
console.log(data);`
    },
    createJob: {
      curl: `curl -X POST "${baseUrl}/v1/jobs" \\
  -H "X-API-Key: rk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Senior AI / Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, LangChain, and PostgreSQL.",
    "target_shortlist_count": 5,
    "custom_prompt": "Prioritize candidates with strong production LLM fine-tuning experience."
  }'`,
      python: `import requests

url = "${baseUrl}/v1/jobs"
headers = {
    "X-API-Key": "rk_live_your_api_key_here",
    "Content-Type": "application/json"
}
payload = {
    "title": "Senior AI / Backend Engineer",
    "description": "Must have 4+ years experience with Python, FastAPI, LangChain, and PostgreSQL.",
    "target_shortlist_count": 5,
    "custom_prompt": "Prioritize candidates with strong production LLM fine-tuning experience."
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
    title: "Senior AI / Backend Engineer",
    description: "Must have 4+ years experience with Python, FastAPI, LangChain, and PostgreSQL.",
    target_shortlist_count: 5,
    custom_prompt: "Prioritize candidates with strong production LLM fine-tuning experience."
  })
});

const job = await response.json();
console.log("Created Job ID:", job.id);`
    },
    uploadResumes: {
      curl: `curl -X POST "${baseUrl}/v1/jobs/JOB_ID/upload" \\
  -H "X-API-Key: rk_live_your_api_key_here" \\
  -F "files=@/path/to/resume_candidate_1.pdf" \\
  -F "files=@/path/to/batch_candidates.zip"`,
      python: `import requests

url = "${baseUrl}/v1/jobs/JOB_ID/upload"
headers = {"X-API-Key": "rk_live_your_api_key_here"}

files = [
    ("files", ("resume_1.pdf", open("resume_1.pdf", "rb"), "application/pdf")),
    ("files", ("batch.zip", open("batch.zip", "rb"), "application/zip"))
]

response = requests.post(url, headers=headers, files=files)
print(response.json())
# Output: {"batch_id": "b_123", "total_files": 10, "message": "Screening initiated"}` ,
      javascript: `const formData = new FormData();
formData.append("files", fileInput.files[0]);

const response = await fetch("${baseUrl}/v1/jobs/JOB_ID/upload", {
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
      curl: `curl -X GET "${baseUrl}/v1/candidates/CANDIDATE_ID" \\
  -H "X-API-Key: rk_live_your_api_key_here"`,
      python: `import requests

url = "${baseUrl}/v1/candidates/CANDIDATE_ID"
headers = {"X-API-Key": "rk_live_your_api_key_here"}

response = requests.get(url, headers=headers)
candidate = response.json()

print(f"Name: {candidate['profile']['name']}")
print(f"Match Score: {candidate['evaluation']['overall_score']}/100")
print(f"Recommendation: {candidate['evaluation']['recommendation']}")`,
      javascript: `const response = await fetch("${baseUrl}/v1/candidates/CANDIDATE_ID", {
  headers: {
    "X-API-Key": "rk_live_your_api_key_here"
  }
});

const candidate = await response.json();
console.log("Candidate Name:", candidate.profile.name);
console.log("Match Score:", candidate.evaluation.overall_score);`
    },
    webhooks: {
      curl: `# Webhook payload sent to your configured endpoint:
{
  "event": "candidate.evaluated",
  "job_id": "job_948f2",
  "candidate_id": "cand_8172b",
  "name": "Sarah Jenkins",
  "overall_score": 94,
  "recommendation": "Strong Shortlist",
  "status": "evaluated"
}`,
      python: `# FastAPI Webhook Receiver Example:
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhooks/resumes")
async def handle_resume_event(request: Request):
    payload = await request.json()
    if payload["event"] == "candidate.evaluated":
        print(f"Candidate {payload['name']} scored {payload['overall_score']}")
    return {"status": "ok"}`,
      javascript: `// Express.js Webhook Receiver
app.post("/webhooks/resumes", (req, res) => {
  const event = req.body;
  if (event.event === "candidate.evaluated") {
    console.log(\`Candidate \${event.name} scored \${event.overall_score}\`);
  }
  res.json({ received: true });
});`
    }
  }

  const navItems = [
    { id: 'auth', label: 'Authentication', icon: Shield, group: 'Getting Started' },
    { id: 'createJob', label: 'Create Job Opening', icon: BriefcaseIcon, group: 'Jobs API' },
    { id: 'uploadResumes', label: 'Upload & Batch Screen', icon: Terminal, group: 'Screening API' },
    { id: 'getCandidate', label: 'Get Evaluation Report', icon: Cpu, group: 'Screening API' },
    { id: 'webhooks', label: 'Webhooks & Events', icon: Webhook, group: 'Integrations' },
  ]

  function BriefcaseIcon(props: any) {
    return <Globe {...props} />
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">REST API v1</span>
              <span className="text-xs text-slate-400 font-mono">OpenAPI 3.1 Spec</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Developer API & SDK Reference
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Programmatically create positions, stream batch resumes (PDF/DOCX/ZIP), trigger asynchronous AI screening, and receive evaluated candidate scores directly in your internal ATS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link to="/settings" className="btn btn-primary text-xs">
              <Key className="w-3.5 h-3.5" /> Manage API Keys
            </Link>
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Swagger Docs
            </a>
          </div>
        </div>
      </div>

      {/* Main Documentation 3-Column / Split Layout */}
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
                          ? 'bg-brand-50 text-brand-700 border border-brand-200 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                        {item.label}
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
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
                X-API-Key: rk_live_...
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                    <Shield className="w-3.5 h-3.5" /> API Security
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">API Key Authentication</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    All requests to the <code className="text-brand-600 font-mono text-xs bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">/v1/*</code> endpoints require an API Key supplied in the <code className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">X-API-Key</code> request header.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Keep your secret keys secure</p>
                    <p className="leading-relaxed">
                      Do not expose your API key in client-side code or public GitHub repositories. You can generate, name, and revoke keys at any time in your <Link to="/settings" className="underline font-bold text-brand-600">Settings dashboard</Link>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Panel */}
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

          {/* Section: Create Job Opening */}
          {activeSection === 'createJob' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-strong font-mono">POST</span>
                    <span className="text-sm font-mono font-bold text-slate-900">/v1/jobs</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Create a New Job Opening</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Creates a hiring position with specific scoring criteria, target shortlist quota, and custom evaluation prompts.
                  </p>
                </div>

                {/* Parameters Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Request Body Parameters</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Field</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Required</th>
                          <th className="py-2.5 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-600">title</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                          <td className="py-2.5 px-3 text-red-600 font-bold">Yes</td>
                          <td className="py-2.5 px-3">Position title (e.g. "Senior Backend Engineer")</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-600">description</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                          <td className="py-2.5 px-3 text-red-600 font-bold">Yes</td>
                          <td className="py-2.5 px-3">Detailed job responsibilities and skill criteria</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-600">target_shortlist_count</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">integer</td>
                          <td className="py-2.5 px-3 text-slate-400">Optional</td>
                          <td className="py-2.5 px-3">Desired shortlist target size (default: 5)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-600">custom_prompt</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">string</td>
                          <td className="py-2.5 px-3 text-slate-400">Optional</td>
                          <td className="py-2.5 px-3">Custom guidance injected into LLM evaluation</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <CodeBlockPanel
                title="Create Job Request"
                snippets={codeSnippets.createJob}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'createJob')}
                copied={copiedKey === 'createJob'}
              />
            </div>
          )}

          {/* Section: Upload Resumes */}
          {activeSection === 'uploadResumes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-strong font-mono">POST</span>
                    <span className="text-sm font-mono font-bold text-slate-900">/v1/jobs/:job_id/upload</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Batch Upload & Ingestion</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Upload multiple PDF, DOCX, or compressed ZIP files to trigger parallel streaming evaluation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800">Supported File Types</span>
                    <p className="text-slate-500">.PDF, .DOCX, and .ZIP archives (auto-unpacked recursively).</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800">Zero Retention</span>
                    <p className="text-slate-500">Files are parsed in memory and never persisted to raw storage.</p>
                  </div>
                </div>
              </div>

              <CodeBlockPanel
                title="Batch Upload Request"
                snippets={codeSnippets.uploadResumes}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'uploadResumes')}
                copied={copiedKey === 'uploadResumes'}
              />
            </div>
          )}

          {/* Section: Get Candidate */}
          {activeSection === 'getCandidate' && (
            <div className="space-y-6 animate-fade-in">
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-blue font-mono">GET</span>
                    <span className="text-sm font-mono font-bold text-slate-900">/v1/candidates/:candidate_id</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Get Evaluated Candidate Report</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Fetch extracted candidate profile details, overall score (0–100), dimensional breakdown, key strengths, and missing skills.
                  </p>
                </div>
              </div>

              <CodeBlockPanel
                title="Get Candidate Request"
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
              <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                    <Webhook className="w-3.5 h-3.5" /> Event Stream
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Webhooks & Real-Time Events</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Receive asynchronous HTTP POST payloads whenever an AI screening finishes for any candidate.
                  </p>
                </div>
              </div>

              <CodeBlockPanel
                title="Webhook Event Sample & Receiver"
                snippets={codeSnippets.webhooks}
                selectedLang={selectedLang}
                setSelectedLang={setSelectedLang}
                onCopy={(text) => copyToClipboard(text, 'webhooks')}
                copied={copiedKey === 'webhooks'}
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
  copied
}: {
  title: string
  snippets: Record<Language, string>
  selectedLang: Language
  setSelectedLang: (l: Language) => void
  onCopy: (t: string) => void
  copied: boolean
}) {
  const currentCode = snippets[selectedLang] || snippets.curl

  return (
    <div className="card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-100">
      {/* Code Header Bar */}
      <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold text-slate-300">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            {(['curl', 'python', 'javascript'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-2.5 py-1 rounded font-bold uppercase transition-all ${
                  selectedLang === lang
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'javascript' ? 'Node.js' : lang}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            onClick={() => onCopy(currentCode)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed bg-slate-900/90 selection:bg-brand-500/30">
        <code>{currentCode}</code>
      </pre>
    </div>
  )
}

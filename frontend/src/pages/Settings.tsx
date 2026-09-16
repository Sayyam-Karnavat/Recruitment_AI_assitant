import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Trash2, Key, Loader2, Copy, Check, Code2,
  ShieldCheck, Webhook, Crown, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react'
import api from '../services/api'
import { useWallet } from '../context/WalletContext'

interface APIKey {
  id: string
  name: string
  created_at: string
}

export default function Settings() {
  const { isUnlimited, userEmail } = useWallet()
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    try {
      const res = await api.get('/keys')
      setKeys(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/keys', { name: newKeyName })
      setCreatedToken(res.data.api_key)
      setNewKeyName('')
      fetchKeys()
    } catch (err) {
      console.error(err)
      alert('Failed to generate API key.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Revoke this API key? Applications using it will immediately lose access.')) return
    try {
      await api.delete(`/keys/${id}`)
      fetchKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const handleCopy = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-9 h-9 text-brand-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Integrations
        </h1>
        <p className="text-sm text-slate-600">
          Manage API keys, webhooks, and account access credentials.
        </p>
      </div>

      {/* VIP Unlimited Pass Banner (for Sanyam) */}
      {(isUnlimited || userEmail === 'sanyam.karnavat5@gmail.com') && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 flex-shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base">VIP Unlimited Master Access Active</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-black">
                  ∞ UNLIMITED
                </span>
              </div>
              <p className="text-xs text-brand-100">
                Logged in as <strong>{userEmail || 'sanyam.karnavat5@gmail.com'}</strong>. All job postings, bulk screenings, and candidate evaluations are completely free with zero credit restrictions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Card */}
      <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-600" />
              Developer API Keys
            </h2>
            <p className="text-xs text-slate-500">
              Authenticate requests to programmatic resume screening endpoints.
            </p>
          </div>

          <Link
            to="/developer-docs"
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5" /> View Developer Docs &rarr;
          </Link>
        </div>

        {/* Newly Created Key Alert */}
        {createdToken && (
          <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                API Key Generated Successfully
              </span>
              <span className="text-[11px] text-brand-700 font-semibold">Copy now (will not be shown again)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdToken}
                className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-brand-200 flex-1 select-all"
              />
              <button
                onClick={handleCopy}
                className="btn btn-primary text-xs py-2.5 px-4 flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Generate Key Form */}
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key Description (e.g., Production ATS Backend)"
            className="field text-xs flex-1"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="btn btn-primary text-xs px-5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        </form>

        {/* Existing Keys Table */}
        <div className="space-y-2 pt-2">
          {keys.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600">No active API keys found.</p>
              <p>Create a key above to authenticate backend requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {keys.map((k) => (
                <div key={k.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">{k.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Created on {new Date(k.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="btn btn-ghost text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-1.5 px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

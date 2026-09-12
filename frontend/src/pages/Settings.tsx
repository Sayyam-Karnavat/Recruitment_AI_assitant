import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Key, Loader2, Copy, Check, Code2 } from 'lucide-react'
import api from '../services/api'

interface APIKey {
  id: string
  name: string
  created_at: string
}

export default function Settings() {
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
      alert("Failed to create API key. Max limit might be reached.")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this API key? Applications using it will break.")) return
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={24} color="var(--c-brand)" />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--c-t1)' }}>Settings</h1>
        <p style={{ margin: 0, color: 'var(--c-t2)', fontSize: '0.9375rem' }}>Manage your developer API keys and integrations.</p>
      </div>

      <div className="card fade-up delay-50" style={{ padding: 28 }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--c-t1)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={18} color="var(--c-brand)" />
          API Keys
        </h2>
        <p style={{ margin: '0 0 16px 0', color: 'var(--c-t2)', fontSize: '0.875rem' }}>
          Use these keys to authenticate API requests from your backend integrations. Never share your secret keys.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--c-t1)' }}>
            <Code2 size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <span>Need help integrating? Check out our code snippets and guides.</span>
          </div>
          <Link to="/developer-docs" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', textDecoration: 'none' }}>
            View API Documentation &rarr;
          </Link>
        </div>

        {createdToken && (
          <div style={{ padding: 16, background: 'var(--c-brand-dim)', border: '1px solid var(--c-brand-hi)', borderRadius: 12, marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-brand-hi)', margin: '0 0 8px 0' }}>New API Key Created!</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--c-t1)', margin: '0 0 12px 0' }}>Please copy this key now. You will not be able to see it again.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: 8, color: 'var(--c-t1)', overflowX: 'auto' }}>
                {createdToken}
              </code>
              <button onClick={handleCopy} className="btn btn-primary" style={{ padding: '8px 12px' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key Name (e.g. Production Backend)"
            className="field"
            style={{ flex: 1 }}
            disabled={creating}
          />
          <button type="submit" disabled={creating || !newKeyName.trim()} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Create Key
          </button>
        </form>

        {keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-t3)', fontSize: '0.875rem' }}>
            You haven't created any API keys yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {keys.map((k, idx) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: idx > 0 ? '1px solid var(--c-border)' : 'none' }}>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--c-t1)', margin: '0 0 4px 0', fontSize: '0.9375rem' }}>{k.name}</p>
                  <p style={{ color: 'var(--c-t3)', margin: 0, fontSize: '0.75rem' }}>Created: {new Date(k.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleDelete(k.id)}
                  className="btn btn-ghost"
                  style={{ color: 'var(--c-red)', padding: '6px 12px', fontSize: '0.8125rem' }}
                >
                  <Trash2 size={14} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

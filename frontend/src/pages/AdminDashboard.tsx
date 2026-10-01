import React, { useState, useEffect } from 'react'
import {
  Users, DollarSign, Cpu, TrendingUp, ShieldCheck, AlertTriangle,
  Search, RefreshCw, CheckCircle2, XCircle, PlusCircle, MinusCircle,
  Briefcase, FileText, ArrowUpRight, Lock, Award, RotateCcw
} from 'lucide-react'
import api from '../services/api'

interface MetricsData {
  overview: {
    total_recruiters: number
    total_jobs: number
    total_candidates: number
    completed_screenings: number
    pending_screenings: number
    failed_screenings: number
    system_fault_rate: number
    user_fault_rate: number
  }
  financials: {
    total_revenue_inr: number
    total_purchases_count: number
    total_tokens_used: number
    total_llm_cost_inr: number
    gross_profit_inr: number
    gross_margin_pct: number
    avg_cost_per_resume_inr: number
    avg_selling_price_per_credit_inr: number
    model_telemetry: {
      active_model: string
      input_rate_per_1m_usd: number
      output_rate_per_1m_usd: number
      usd_to_inr_peg: number
    }
  }
}

interface AdminUser {
  id: string
  email: string
  credits: number
  role: string
  is_active: boolean
  created_at: string
  job_count: number
  candidate_count: number
  total_spent_inr: number
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<number>(50)
  const [adjustReason, setAdjustReason] = useState<string>('Administrative customer perk')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      const [metricsRes, usersRes] = await Promise.all([
        api.get('/admin/metrics'),
        api.get('/admin/users')
      ])
      setMetrics(metricsRes.data)
      setUsers(usersRes.data)
    } catch (err: any) {
      console.error('Failed to load admin data:', err)
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to load administrative analytics.',
        isError: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setIsSubmitting(true)
      const res = await api.post(`/admin/users/${selectedUser.id}/credits`, {
        amount_credits: adjustAmount,
        reason: adjustReason
      })
      setStatusMessage({ text: res.data.message })
      setSelectedUser(null)
      loadAdminData()
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to adjust credits.',
        isError: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const res = await api.post(`/admin/users/${user.id}/status`, {
        is_active: !user.is_active
      })
      setStatusMessage({ text: res.data.message })
      loadAdminData()
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to update user status.',
        isError: true
      })
    }
  }

  const handleResetTelemetry = async () => {
    if (!window.confirm("Are you sure you want to reset test financial metrics? This will clear test purchase transactions, resetting revenue and gross profit to ₹0 for production launch.")) {
      return
    }
    try {
      setIsSubmitting(true)
      const res = await api.post('/admin/reset-telemetry', {
        reset_transactions: true,
        reset_candidates: false,
      })
      setStatusMessage({ text: res.data.message })
      await loadAdminData()
    } catch (err: any) {
      setStatusMessage({
        text: err.response?.data?.detail || 'Failed to reset test telemetry.',
        isError: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && !metrics) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Aggregating platform telemetry & token economics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-2">
            <ShieldCheck size={13} />
            <span>Superadmin Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Financial & Token Cost Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time telemetry measuring gross margins, Azure/OpenAI token spend, and recruiter accounts.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleResetTelemetry}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 shadow-xs transition-colors disabled:opacity-50"
            title="Reset test purchase transactions to ₹0"
          >
            <RotateCcw size={13} />
            <span>Reset Test Revenue</span>
          </button>
          <button
            onClick={loadAdminData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between animate-fade-in ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* KPI 4-Card Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              ₹{metrics.financials.total_revenue_inr.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>{metrics.financials.total_purchases_count} Razorpay top-ups</span>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">LLM Token Cost</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cpu size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              ₹{metrics.financials.total_llm_cost_inr.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500">
              {(metrics.financials.total_tokens_used / 1_000_000).toFixed(2)}M tokens consumed
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Gross Profit Margin</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-slate-900 font-mono">
                {metrics.financials.gross_margin_pct}%
              </p>
              <span className="text-xs font-bold text-emerald-600">
                (₹{metrics.financials.gross_profit_inr.toLocaleString()} Net)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Targeting 80%–90% profitability</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Cost / Resume</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              ₹{metrics.financials.avg_cost_per_resume_inr}
            </p>
            <p className="text-[11px] text-slate-500">
              ~7.3 paise AI + ~7.3 paise infra
            </p>
          </div>
        </div>
      )}

      {/* Model Telemetry Banner */}
      {metrics && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400">
                Live Pricing Peg
              </span>
              <h3 className="text-base font-bold mt-0.5">
                Primary Model: {metrics.financials.model_telemetry.active_model}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Input: ${metrics.financials.model_telemetry.input_rate_per_1m_usd}/1M tokens • Output: ${metrics.financials.model_telemetry.output_rate_per_1m_usd}/1M tokens • Pegged @ ₹{metrics.financials.model_telemetry.usd_to_inr_peg}/USD
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Total Candidates</span>
                <span className="text-white font-bold">{metrics.overview.total_candidates}</span>
              </div>
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Evaluated</span>
                <span className="text-emerald-400 font-bold">{metrics.overview.completed_screenings}</span>
              </div>
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
                <span className="text-slate-400 block text-[10px]">Fault Rate</span>
                <span className="text-amber-400 font-bold">{metrics.overview.system_fault_rate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter Accounts Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Recruiters ({users.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage credit allocations, account statuses, and inspect hiring activity.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recruiter email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Jobs</th>
                <th className="py-3 px-4">Applicants</th>
                <th className="py-3 px-4">Spent</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSuperadmin = u.email === 'sanyam.karnavat5@gmail.com' || u.email === 'admin@uppshot.com' || u.email === 'admin@resumeai.com'
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{u.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {u.credits >= 900000 ? (
                          <span className="text-purple-600">Unlimited (VIP)</span>
                        ) : (
                          <span>{u.credits}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{u.job_count}</td>
                      <td className="py-3.5 px-4 font-mono">{u.candidate_count}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ₹{u.total_spent_inr}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                        >
                          Adjust Credits
                        </button>
                        {!isSuperadmin && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              u.is_active
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Adjustment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900">
              Adjust Credits for {selectedUser.email}
            </h3>
            <p className="text-xs text-slate-500">
              Current balance: <span className="font-bold text-slate-800">{selectedUser.credits} Credits</span>
            </p>

            <form onSubmit={handleAdjustCredits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Amount (+ to grant, - to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Audit Ledger
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Free beta customer top-up"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

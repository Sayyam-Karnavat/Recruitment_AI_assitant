import React, { useEffect } from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { ShieldAlert, LogOut, Activity, Lock, ExternalLink, RefreshCw } from 'lucide-react'

export default function AdminLayout() {
  const navigate = useNavigate()
  const adminToken = localStorage.getItem('admin_token')
  const adminUsername = localStorage.getItem('admin_username') || 'Administrator'

  useEffect(() => {
    if (!adminToken) {
      navigate('/admin/login', { replace: true })
    }
  }, [adminToken, navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    navigate('/admin/login', { replace: true })
  }

  if (!adminToken) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {/* Dedicated Executive Top Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-6 h-16 flex items-center justify-between shadow-lg">
        {/* Brand & Security Level */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldAlert size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                Upp<span className="text-blue-400">shot</span> Admin
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Superadmin
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Telemetry & Unit Economics Console</p>
          </div>
        </div>

        {/* Right Actions: Telemetry status & Sign Out */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure Admin Session</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-xs font-semibold text-slate-300 hidden md:block">
              {adminUsername}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all shadow-sm"
              title="Sign out of Admin Console"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="flex-1 bg-slate-50 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

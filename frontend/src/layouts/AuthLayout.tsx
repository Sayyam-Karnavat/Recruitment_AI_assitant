import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Settings as SettingsIcon, LogOut, Menu, X, ChevronLeft, Code2, Sparkles, Infinity as InfinityIcon } from 'lucide-react'
import { useWallet } from '../context/WalletContext'
import WalletModal from '../components/WalletModal'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Developer APIs', path: '/developer-docs', icon: Code2 },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
]

function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
      <Sparkles size={size - 4} className="text-white" />
    </div>
  )
}

export default function AuthLayout() {
  const { logout } = useAuth()
  const { credits, isUnlimited, openWalletModal } = useWallet()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ── Desktop Sidebar ── */}
      <aside
        aria-label="Sidebar navigation"
        className={`hidden lg:flex bg-white border-r border-slate-200/90 flex-col flex-shrink-0 sticky top-0 h-screen z-30 transition-all duration-300 shadow-sm ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-3.5 h-16 border-b border-slate-200/80 flex-shrink-0 bg-white">
          {!collapsed ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 text-decoration-none overflow-hidden"
              aria-label="ResumeAI home"
            >
              <LogoMark size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                  Resume<span className="text-blue-600">AI</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Recruiter Studio
                </span>
              </div>
            </Link>
          ) : (
            <div className="mx-auto">
              <LogoMark size={18} />
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-3 border-t border-slate-200/80 flex-shrink-0 bg-slate-50/50">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            aria-label="Log out"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-rose-600" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sliding Drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 bg-white">
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5"
          >
            <LogoMark size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                Resume<span className="text-blue-600">AI</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Recruiter Studio
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              setMobileOpen(false)
              logout()
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut size={18} className="text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center px-4 sm:px-6 h-16 gap-3 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Mobile menu toggle */}
          <button
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex-1" />

          {/* Wallet credit badge & top-up action */}
          <button
            onClick={openWalletModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all shadow-sm ${
              isUnlimited
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 text-slate-800'
            }`}
            title="Account Usage & Credits"
          >
            {isUnlimited ? (
              <>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white shadow-xs">
                  <InfinityIcon size={12} strokeWidth={3} />
                </span>
                <span className="text-xs font-bold tracking-tight text-blue-900">
                  Unlimited VIP Pro
                </span>
                <span className="text-[10px] font-bold uppercase bg-blue-100/80 text-blue-700 px-2 py-0.5 rounded-full">
                  No Limits
                </span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  {credits} Credits
                </span>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs hover:bg-blue-700">
                  + Top Up
                </span>
              </>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Wallet Top-up Modal */}
      <WalletModal />
    </div>
  )
}

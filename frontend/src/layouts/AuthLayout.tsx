import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, Settings as SettingsIcon, LogOut, Menu, X, ChevronLeft, Code2, CreditCard } from 'lucide-react'
import { useWallet } from '../context/WalletContext'
import WalletModal from '../components/WalletModal'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'API Docs', path: '/developer-docs', icon: Code2 },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
]

// Inline SVG logo mark
function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M5.5 6.5h7M5.5 9h7M5.5 11.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export default function AuthLayout() {
  const { logout } = useAuth()
  const { credits, openWalletModal } = useWallet()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-base)' }}>

      {/* ── Sidebar ── */}
      <aside
        aria-label="Sidebar navigation"
        style={{
          width: collapsed ? 'var(--sidebar-w-rail)' : 'var(--sidebar-w)',
          // Apple spring-slide: cubic-bezier(0.25, 1, 0.5, 1)
          transition: 'width 300ms var(--ease-spring-slide)',
          background: 'var(--c-surface)',
          borderRight: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowX: 'hidden',
          zIndex: 30,
        }}
      >
        {/* Logo row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '0 14px',
          height: 56,
          borderBottom: '1px solid var(--c-border)',
          flexShrink: 0,
          transition: 'padding 300ms var(--ease-spring-slide)',
        }}>
          {!collapsed && (
            <Link
              to="/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                textDecoration: 'none', overflow: 'hidden',
                animation: 'fadeIn 0.25s var(--ease-spring) both',
              }}
              aria-label="ResumeAI home"
            >
              <span style={{
                width: 30, height: 30,
                background: 'var(--c-brand)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
              }}>
                <LogoMark size={16} />
              </span>
              <span style={{
                fontWeight: 700,
                fontSize: '0.9375rem',
                letterSpacing: '-0.025em',
                color: 'var(--c-t1)',
                whiteSpace: 'nowrap',
              }}>
                ResumeAI
              </span>
            </Link>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn-icon"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ flexShrink: 0 }}
          >
            <ChevronLeft
              size={16}
              style={{
                transition: 'transform 300ms var(--ease-spring-slide)',
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = isActive(path)
            return (
              <Link
                key={path}
                to={path}
                className={`nav-link ${active ? 'active' : ''}`}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                style={{ justifyContent: collapsed ? 'center' : undefined }}
              >
                <Icon size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ animation: 'fadeIn 0.2s var(--ease-spring) both' }}>
                    {label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--c-border)', flexShrink: 0 }}>
          <button
            onClick={logout}
            className="nav-link"
            aria-label="Log out"
            style={{
              color: 'var(--c-t3)',
              justifyContent: collapsed ? 'center' : undefined,
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--c-red-dim)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--c-red)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = ''
              ;(e.currentTarget as HTMLElement).style.color = 'var(--c-t3)'
            }}
          >
            <LogOut size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ animation: 'fadeIn 0.2s var(--ease-spring) both' }}>
                Log Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden fade-in"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header
          className="glass"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            height: 56,
            gap: 12,
            borderBottom: '1px solid var(--c-border)',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            borderRadius: 0,
          }}
        >
          {/* Mobile menu toggle */}
          <button
            className="btn-icon lg:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div style={{ flex: 1 }} />

          {/* Wallet credit badge & top-up action */}
          <button
            onClick={openWalletModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid rgba(59, 130, 246, 0.35)',
              background: 'rgba(59, 130, 246, 0.08)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)')}
            title="Resume credits balance. Click to recharge."
          >
            <CreditCard size={15} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--c-t1)' }}>
              {credits} Credits
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.2)',
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              + Top Up
            </span>
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Global Wallet Top-up Modal */}
      <WalletModal />
    </div>
  )
}

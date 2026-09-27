import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { WalletProvider } from './context/WalletContext'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import JobDetail from './pages/JobDetail'
import CandidateDetail from './pages/CandidateDetail'
import Settings from './pages/Settings'
import DeveloperDocs from './pages/DeveloperDocs'
import PublicJobApply from './pages/PublicJobApply'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import RefundPolicy from './pages/RefundPolicy'
import ContactUs from './pages/ContactUs'
import AdminDashboard from './pages/AdminDashboard'
import { useWallet } from './context/WalletContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const { isAdmin, loading } = useWallet()
  if (!token) return <Navigate to="/login" replace />
  if (!loading && !isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (token) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <Routes>
          {/* Public candidate, auth and compliance routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/careers/:jobId" element={<PublicJobApply />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<ContactUs />} />
          </Route>

          {/* Protected employer/HR routes */}
          <Route element={<ProtectedRoute><AuthLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:jobId/candidates/:candidateId" element={<CandidateDetail />} />
            <Route path="/developer-docs" element={<DeveloperDocs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </WalletProvider>
    </AuthProvider>
  )
}

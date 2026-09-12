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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
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
          {/* Public candidate and auth routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/careers/:jobId" element={<PublicJobApply />} />
          </Route>

          {/* Protected employer/HR routes */}
          <Route element={<ProtectedRoute><AuthLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
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

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { WalletProvider } from './context/WalletContext'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
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
import AboutUs from './pages/AboutUs'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'

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
          {/* Public candidate, auth and compliance routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/careers/:jobId" element={<PublicJobApply />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/about-us" element={<Navigate to="/about" replace />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-and-conditions" element={<Navigate to="/terms" replace />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
            <Route path="/500" element={<ServerError />} />
          </Route>

          {/* Protected employer/HR routes */}
          <Route element={<ProtectedRoute><AuthLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:jobId/candidates/:candidateId" element={<CandidateDetail />} />
            <Route path="/developer-docs" element={<DeveloperDocs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Dedicated Standalone Admin Portal */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>

          {/* Custom Branded 404 Not Found Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WalletProvider>
    </AuthProvider>
  )
}

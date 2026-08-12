import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FileText, Loader2, CheckCircle2, Sparkles, Zap, ShieldCheck } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'

export default function Login() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('')
    setLoading(true)
    try {
      if (credentialResponse.credential) {
        await loginWithGoogle(credentialResponse.credential)
        navigate('/dashboard')
      } else {
        setError('Google login failed')
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      {/* Left Panel - Branding & Value Prop */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 text-white p-12 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[100px]" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 w-max">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight">ResumeAI</span>
          </Link>

          <div className="mt-32 max-w-md">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-6">
              Hire the top 1% faster with AI.
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-10">
              Automate your screening process. Our AI parses, evaluates, and ranks hundreds of resumes against your job descriptions in seconds.
            </p>

            <div className="space-y-5">
              <div className="flex items-center gap-3 text-slate-200">
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="font-medium">10x faster shortlisting</span>
              </div>
              <div className="flex items-center gap-3 text-slate-200">
                <div className="p-1 rounded-full bg-blue-500/20 text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-medium">Unbiased, data-driven AI scoring</span>
              </div>
              <div className="flex items-center gap-3 text-slate-200">
                <div className="p-1 rounded-full bg-purple-500/20 text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-medium">Secure and explainable results</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()} ResumeAI Inc.</span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2 justify-center mb-10">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">ResumeAI</span>
          </Link>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Welcome back
            </h2>
            <p className="text-slate-500">
              Sign in to your account to continue your workflow.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center">
            
            {error && (
              <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-xl text-sm text-red-600 w-full flex items-start gap-3">
                <span className="shrink-0 text-red-500 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-4 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Authenticating...</span>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full relative flex justify-center mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative bg-white px-4 text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Secure Login
                  </div>
                </div>

                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google login was unsuccessful')}
                  useOneTap
                  theme="outline"
                  size="large"
                  shape="pill"
                  width="320"
                />
                
                <p className="mt-8 text-xs text-slate-400 text-center max-w-[280px]">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

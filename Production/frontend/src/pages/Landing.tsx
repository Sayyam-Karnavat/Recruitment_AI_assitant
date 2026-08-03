import { Link } from 'react-router-dom'
import { FileText, Zap, BarChart3, Shield } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Bulk Upload', desc: 'Upload 100+ resumes at once — PDF, DOCX, or ZIP files.' },
  { icon: Zap, title: 'AI Screening', desc: 'Instant structured extraction and scoring against your job description.' },
  { icon: BarChart3, title: 'Ranked Results', desc: 'Candidates ranked by fit score with explainable reasoning per category.' },
  { icon: Shield, title: 'Transparent', desc: 'See exactly why each candidate scored the way they did. No black box.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg text-slate-800">ResumeAI</span>
        </div>
        <Link
          to="/login"
          className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
          Screen resumes in minutes,<br />
          <span className="text-primary">not hours</span>
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
          Upload your job description and candidate resumes. Our AI reads, extracts, and ranks
          every candidate with detailed scoring and clear explanations.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          Get Started Free
          <Zap className="w-4 h-4" />
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © 2026 ResumeAI. Built for HR teams who value their time.
      </footer>
    </div>
  )
}

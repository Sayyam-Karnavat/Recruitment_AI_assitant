import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Share2, Layers, Cpu, Zap, Star } from 'lucide-react'

function AnimatedCounter({ target, duration = 1400 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef<number>()

  useEffect(() => {
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return <>{value}</>
}

const features = [
  {
    icon: <Share2 className="w-5 h-5 text-blue-600" />,
    title: 'LinkedIn-Ready Public Links',
    desc: 'Generate shareable public career links with 1 click. Candidates apply directly while AI screens them instantly.',
  },
  {
    icon: <Cpu className="w-5 h-5 text-sky-600" />,
    title: 'Multi-Dimensional AI Evaluation',
    desc: 'Scores resumes across technical depth, experience duration, project quality, and role compatibility in seconds.',
  },
  {
    icon: <Layers className="w-5 h-5 text-indigo-600" />,
    title: 'Bulk & Cloud Ingestion',
    desc: 'Drop 100+ resumes via nested ZIPs, Google Drive, or OneDrive. Automatic in-memory stream parsing with 0 disk footprint.',
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    title: 'Anti-Cheat Candidate Lock',
    desc: 'Google SSO & GitHub OAuth verification stops repeated resume gaming and ensures verified applicant identity.',
  },
]

const stats = [
  { value: 1000, suffix: '+', label: 'Active Recruiters' },
  { value: 150000, suffix: '+', label: 'Resumes Evaluated' },
  { value: 95, suffix: '%', label: 'Screening Accuracy' },
  { value: 10, suffix: 'x', label: 'Faster Hiring Time' },
]

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-100/60 via-sky-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[600px] -right-40 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Resume<span className="text-blue-600">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/developer-docs"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors hidden sm:inline-block"
            >
              API Docs
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              Get Started Free <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-xs mb-8 fade-up">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Next-Gen Semantic Recruitment AI
          </span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08] max-w-4xl mx-auto mb-6 fade-up">
          Screen 1,000+ Resumes with{' '}
          <span className="gradient-text">Human Precision</span> in Seconds.
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed fade-up">
          Create customized job pipelines, share candidate application links directly on LinkedIn, and let multi-dimensional LLM scoring rank your top candidates automatically.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 fade-up">
          <Link
            to="/login"
            className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center gap-2"
          >
            Start Free Screening (50 Credits)
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/developer-docs"
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-200 shadow-sm transition-all"
          >
            Explore Developer APIs
          </Link>
        </div>

        {/* Interactive Candidate Ranking Preview Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 max-w-4xl mx-auto text-left mb-20 fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Live AI Shortlist Engine
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">Senior Full Stack Engineer</h3>
              <p className="text-xs text-slate-500">128 applicants screened · 12 shortlisted · Average time: 2.8s/resume</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                <CheckCircle2 size={13} /> Active Pipeline
              </span>
            </div>
          </div>

          {/* Sample Candidates */}
          <div className="mt-4 space-y-3">
            {[
              {
                rank: '#1',
                name: 'Ananya Sharma',
                exp: '6.5 yrs exp',
                score: 96,
                match: 'Strong Match',
                color: 'emerald',
                skills: ['FastAPI', 'React 18', 'Distributed Systems', 'PostgreSQL'],
              },
              {
                rank: '#2',
                name: 'Rohan Mehta',
                exp: '5.2 yrs exp',
                score: 91,
                match: 'Strong Match',
                color: 'emerald',
                skills: ['Python', 'TypeScript', 'Docker', 'Redis'],
              },
              {
                rank: '#3',
                name: 'Devansh Patel',
                exp: '4.0 yrs exp',
                score: 84,
                match: 'Shortlist',
                color: 'blue',
                skills: ['Node.js', 'React', 'TailwindCSS', 'AWS'],
              },
            ].map((c) => (
              <div
                key={c.name}
                className="flex flex-wrap items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-extrabold text-sm text-slate-700 flex items-center justify-center shadow-xs">
                    {c.rank}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                    <span className="text-xs text-slate-500">{c.exp}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 my-2 sm:my-0">
                  {c.skills.map((s) => (
                    <span key={s} className="text-[11px] font-medium bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">{c.score}%</span>
                    <span className="block text-[10px] font-bold uppercase text-emerald-600">{c.match}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm mb-20 fade-up">
          {stats.map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                <AnimatedCounter target={value} />
                {suffix}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Built for Modern Recruitment Teams
          </h2>
          <p className="text-slate-600 max-w-lg mx-auto mt-2 text-sm">
            Everything you need to automate resume intake, screening, and evaluation with enterprise accuracy.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left mb-20">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-slate-200 hover:border-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">{f.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-10 sm:p-14 text-white text-center shadow-xl shadow-blue-600/20">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to streamline your hiring pipeline?
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto text-base mb-8">
            Create your first job posting in under 2 minutes, get your LinkedIn-ready shareable link, and experience semantic AI screening today.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 shadow-lg transition-all"
          >
            Get Started with 10 Free Credits <ArrowRight size={16} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ResumeAI</span>
            <span>— Precision AI Recruitment Intelligence</span>
          </div>
          <div>© {new Date().getFullYear()} ResumeAI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

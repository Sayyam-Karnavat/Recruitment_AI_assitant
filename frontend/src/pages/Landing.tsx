import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Share2, Layers, Cpu, Zap, Star, Lock, Eye, Server, RefreshCw, FileText, AlertCircle, ShieldAlert } from 'lucide-react'

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
  { value: 99, suffix: '%', label: 'Screening Accuracy' },
  { value: 10, suffix: 'x', label: 'Faster Hiring Speed' },
  { prefix: '< ', value: 3, suffix: 's', label: 'Screening Time Per Resume' },
  { value: 100, suffix: '%', label: 'In-Memory Data Privacy' },
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
              Upp<span className="text-blue-600">shot</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <a
              href="#privacy"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden sm:block"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors hidden sm:block"
            >
              Terms of Service
            </a>
            <Link
              to="/login"
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center gap-1.5"
            >
              Sign In <ArrowRight size={14} />
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
            Autonomous Resume Screening & Shortlisting
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
            Start Free Screening (10 Credits)
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
                name: 'Candidate XYZ-01',
                exp: '6.5 yrs exp',
                score: 96,
                match: 'Strong Match',
                color: 'emerald',
                skills: ['FastAPI', 'React 18', 'Distributed Systems', 'PostgreSQL'],
              },
              {
                rank: '#2',
                name: 'Candidate XYZ-02',
                exp: '5.2 yrs exp',
                score: 91,
                match: 'Strong Match',
                color: 'emerald',
                skills: ['Python', 'TypeScript', 'Docker', 'Redis'],
              },
              {
                rank: '#3',
                name: 'Candidate XYZ-03',
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
          {stats.map(({ prefix, value, suffix, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
                {prefix || ''}
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

        {/* Privacy Policy & Data Governance Section */}
        <section id="privacy" className="text-left mb-24 pt-12 border-t border-slate-200/80 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Data Protection & Compliance Standard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy & Security
            </h2>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              Uppshot is committed to protecting candidate personal data and recruiter confidentiality. 
              Our recruitment intelligence platform operates with zero LLM model training and strict data sovereignty.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Card 1: Data Collection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <Eye size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">1. Information We Collect</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We only collect information strictly required to evaluate and rank candidate resumes:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li><strong>Account Identity:</strong> Email and profile name authenticated via Google OAuth or GitHub OAuth.</li>
                <li><strong>Application Data:</strong> Candidate name, phone, email, career experience, and skills extracted from uploaded PDF/DOCX resumes.</li>
                <li><strong>Billing Audit Logs:</strong> Transaction identifiers generated securely via Razorpay (we never store card numbers or payment credentials).</li>
              </ul>
            </div>

            {/* Card 2: Google API Limited Use Disclosure */}
            <div className="bg-white border border-blue-200/90 rounded-2xl p-6 shadow-xs space-y-3 relative overflow-hidden bg-gradient-to-br from-white to-blue-50/20">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <Lock size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">2. Google API Limited Use Disclosure</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uppshot's use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold hover:text-blue-700"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li><strong>Google Picker Scope:</strong> Our Google Drive integration requests only <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">drive.file</code> to access only the single resume document you explicitly pick.</li>
                <li><strong>Strict Privacy:</strong> We do not scan, browse, or read any other files or folders in your Google Drive.</li>
              </ul>
            </div>

            {/* Card 3: AI & LLM Data Protection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <Server size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">3. AI Privacy & Zero LLM Training</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Candidate data belongs exclusively to the recruiter and applicant:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li><strong>Zero Foundation Model Training:</strong> Applicant data is NEVER used to train, retrain, or fine-tune public foundation AI models (OpenAI or Azure).</li>
                <li><strong>In-Memory Processing:</strong> Resumes are parsed dynamically in transient memory with zero unencrypted disk caching.</li>
                <li><strong>Encryption:</strong> All data transmissions are protected via industry-standard TLS 1.3 encryption.</li>
              </ul>
            </div>

            {/* Card 4: Data Retention & User Deletion Rights */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <RefreshCw size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">4. Retention & Candidate Rights</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recruiters retain full ownership and authority over all candidate information:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li><strong>Permanent Cascade Deletion:</strong> Deleting a candidate or job posting immediately and permanently purges all resume profiles, evaluations, and categorical scores from the database.</li>
                <li><strong>DPO Inquiries:</strong> For data deletion or privacy inquiries, contact our Data Protection Officer at <a href="mailto:support@uppshot.com" className="text-blue-600 font-medium">support@uppshot.com</a> or <a href="mailto:sanyam.karnavat5@gmail.com" className="text-blue-600 font-medium">sanyam.karnavat5@gmail.com</a>.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/privacy"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-4 py-2 rounded-xl transition-all"
            >
              <FileText size={14} /> Read Full Standalone Privacy Policy Page <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Terms of Service Section */}
        <section id="terms" className="text-left mb-24 pt-12 border-t border-slate-200/80 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <FileText size={14} className="text-blue-600" />
              <span>User Agreement & Service Conditions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Terms of Service
            </h2>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              These terms govern your access to Uppshot (operated by Artificial Grrow, https://www.artificial-grrow.online, and hosted at https://uppshot.com) 
              for candidate resume parsing, applicant evaluation, and recruitment pipeline management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Card 1: Acceptance & Accounts */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">1. Acceptance of Terms</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                By creating an account, authenticating via Google or GitHub, purchasing screening credits, or accessing our developer APIs, you agree to comply with these Terms of Service and represent that you have legal authority to bind your organization.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Users must maintain valid account credentials and prevent unauthorized third-party access.</li>
                <li>Recruiters are solely responsible for ensuring uploaded job specifications comply with applicable labor laws.</li>
              </ul>
            </div>

            {/* Card 2: Credit Wallet & Usage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <CheckCircle2 size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">2. Credit Wallet & Usage Rules</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uppshot operates on a transparent, pre-paid credit infrastructure:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li><strong>Unit Consumption:</strong> Exactly 1 credit is deducted per candidate resume processed and evaluated.</li>
                <li><strong>Welcome Bonus:</strong> Every new verified recruiter account receives 10 free screening credits upon initial sign-in.</li>
                <li><strong>Validity:</strong> Purchased screening credits remain active for 365 days from the transaction date.</li>
                <li><strong>Billing Security:</strong> All financial payments are processed through Razorpay; we never handle or store raw payment credentials.</li>
              </ul>
            </div>

            {/* Card 3: Prohibited Conduct & Fair Use */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-sm">
                <ShieldAlert size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">3. Prohibited Conduct & Fair Use</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                To safeguard service availability, users and API integrators must not:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Submit corrupted files, decompressed zip bombs, or scripts intended to disrupt platform stability.</li>
                <li>Conduct automated scraping, bot applications, or credential abuse against public candidate links.</li>
                <li>Direct custom webhooks towards loopback addresses or internal cloud metadata IP addresses.</li>
                <li>Attempt to decompile, reverse-engineer, or clone proprietary evaluation prompts or algorithms.</li>
              </ul>
            </div>

            {/* Card 4: AI Evaluation Disclaimer */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                <AlertCircle size={18} />
              </div>
              <h3 className="font-bold text-base text-slate-900">4. Decision Support & Jurisdiction</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uppshot provides algorithmic semantic evaluation strictly as decision-support intelligence for human hiring teams:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Final hiring decisions, interview scheduling, and background checks remain the exclusive prerogative of the employer.</li>
                <li>These Terms are governed by the commercial laws of India, subject to the jurisdiction of the competent courts.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/terms"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 px-4 py-2 rounded-xl transition-all"
            >
              <FileText size={14} /> Read Full Standalone Terms of Service Page <ArrowRight size={14} />
            </Link>
          </div>
        </section>

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
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Uppshot</span>
            <span>— Precision AI Recruitment Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Full Policy Page</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Full Terms Page</Link>
            <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">Refund Policy</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link>
          </div>
          <div>© {new Date().getFullYear()} Uppshot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

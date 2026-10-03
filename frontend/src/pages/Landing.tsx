import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import BrandLogo from '../components/BrandLogo'
import {
  Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Share2, Layers,
  Cpu, Menu, X, Building2, Mail, ChevronDown, HelpCircle, FileText
} from 'lucide-react'

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

const faqs = [
  {
    q: 'What is AI resume screening software and how does it work?',
    a: 'AI resume screening software uses natural language processing (NLP) and large language models (LLMs) to automatically parse, evaluate, and rank candidate resumes against role requirements. Rather than relying on rigid keyword matches, Uppshot analyzes technical depth, project quality, verified career duration, and contextual role compatibility to generate an explainable 0-100% suitability score for every applicant in under 3 seconds.',
  },
  {
    q: 'How does Uppshot differ from legacy ATS keyword filters?',
    a: 'Legacy applicant tracking systems (ATS) depend on exact string matching. This frequently filters out qualified candidates who use alternative phrasing while rewarding applicants who engage in "keyword stuffing". Uppshot uses deep semantic intelligence to understand the context and substance of an applicant\'s experience, eliminating keyword bias and surface-level rejections.',
  },
  {
    q: 'Does AI resume screening replace human recruiters and hiring managers?',
    a: 'No. Uppshot is designed as an autonomous decision-support copilot for talent acquisition teams. It eliminates the manual drudgery of reading through hundreds of resumes by pre-ranking candidates and providing multi-dimensional score breakdowns. Human hiring managers make all final interview, evaluation, and hiring decisions with richer, unbiased data.',
  },
  {
    q: 'How does Uppshot protect candidate data privacy and ensure zero model training?',
    a: 'Uppshot treats all candidate data and resume content with strict corporate confidentiality. Applicant submissions are strictly isolated to the recruiter’s workspace and are NEVER used to train, retrain, or fine-tune public foundation AI models (such as OpenAI or Azure models). Recruiters retain full data ownership and can trigger permanent cascade deletion of candidate records, evaluation scores, and files at any time.',
  },
  {
    q: 'How does the anti-cheat applicant verification prevent duplicate or spam submissions?',
    a: 'When recruiters generate and share public application links on LinkedIn, job boards, or career portals, candidates authenticate via Google SSO or GitHub OAuth. This authenticates the applicant\'s true identity, preventing candidate spoofing, bot spam, and repeated submissions intended to manipulate screening algorithms.',
  },
  {
    q: 'Can recruiters upload resumes in bulk from Google Drive, OneDrive, or ZIP files?',
    a: 'Yes. Uppshot supports bulk ingestion of 100+ resumes via nested ZIP archives (both flat and folder-structured), direct drag-and-drop of PDF and DOCX files, and seamless one-click cloud imports through Google Drive Picker and Microsoft OneDrive. All files are extracted and processed asynchronously in parallel.',
  },
  {
    q: 'How does AI-powered candidate screening reduce hiring bias?',
    a: 'Human screening can unintentionally be influenced by cognitive shortcuts, formatting styles, school prestige, or demographic indicators. Uppshot evaluates applicants strictly against objective job parameters: core qualifications, relevant domain experience, project outcomes, and role longevity, fostering a transparent, merit-first shortlisting process.',
  },
  {
    q: 'What is Uppshot’s pricing model for screening candidates?',
    a: 'Uppshot offers a transparent, pay-as-you-go credit wallet model starting as low as ₹0.79 per resume evaluated. Every newly verified recruiter receives 10 free screening credits upon sign-in. There are no mandatory monthly recurring subscription locks, hidden onboarding fees, or minimum seat requirements.',
  },
]

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
    desc: 'Upload 100+ resumes at once via nested ZIP folders, batch drag-and-drop, or direct cloud import from Google Drive and OneDrive.',
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
  { value: 100, suffix: '+', label: 'Resumes Per Bulk Upload' },
]

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-100/60 via-sky-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[600px] -right-40 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="relative z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none">
            <BrandLogo className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Upp<span className="text-blue-600">shot</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#comparison" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Comparison
            </a>
            <a href="#faq" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              FAQ
            </a>
            <Link to="/about" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              About Us
            </Link>
            <Link to="/contact" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-sm shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center gap-1.5"
            >
              <span>Sign In</span> <ArrowRight size={14} />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in shadow-xl">
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <Building2 size={16} className="text-blue-600" />
              <span>About Us</span>
            </Link>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <Cpu size={16} className="text-sky-600" />
              <span>Platform Features</span>
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <CheckCircle2 size={16} className="text-blue-600" />
              <span>Comparison</span>
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <HelpCircle size={16} className="text-sky-600" />
              <span>Frequently Asked Questions</span>
            </a>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <Mail size={16} className="text-indigo-600" />
              <span>Contact & Support</span>
            </Link>
            <Link
              to="/developer-docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <FileText size={16} className="text-emerald-600" />
              <span>Developer API</span>
            </Link>
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2 px-3 text-xs text-slate-500">
              <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Privacy Policy</Link>
              <Link to="/terms" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Terms of Service</Link>
              <Link to="/refund-policy" onClick={() => setMobileMenuOpen(false)} className="hover:text-blue-600">Refund Policy</Link>
            </div>
          </div>
        )}
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
              <h3 className="text-lg font-bold text-slate-900 mt-2">Role Requisition XYZ-01</h3>
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
                skills: ['Core Qualifications', 'Domain Expertise', 'Project Execution', 'Role Alignment'],
              },
              {
                rank: '#2',
                name: 'Candidate XYZ-02',
                exp: '5.2 yrs exp',
                score: 91,
                match: 'Strong Match',
                color: 'emerald',
                skills: ['Requirement Match', 'Analytical Depth', 'Team Leadership', 'Problem Solving'],
              },
              {
                rank: '#3',
                name: 'Candidate XYZ-03',
                exp: '4.0 yrs exp',
                score: 84,
                match: 'Shortlist',
                color: 'blue',
                skills: ['Relevant Experience', 'Role Adaptability', 'Communication', 'Industry Background'],
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
        <section id="features" className="scroll-mt-20">
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
        </section>

        {/* Point-Wise Comparison Section: Traditional ATS vs. Uppshot AI */}
        <section id="comparison" className="text-left mb-24 pt-12 border-t border-slate-200/80 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <CheckCircle2 size={14} className="text-blue-600" />
              <span>Feature Comparison</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Traditional Resume Screening vs. Uppshot AI
            </h2>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              Why modern hiring teams are switching from slow, keyword-based filters to autonomous multi-dimensional evaluation.
            </p>
          </div>

          {/* Comparison Table / Cards */}
          <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-50/80 border-b border-slate-200">
              <div className="p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-700">Traditional ATS & Manual Review</h3>
                  <p className="text-xs text-slate-500">Rigid keyword filters & manual triage</p>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-blue-900">Uppshot AI Shortlisting</h3>
                    <p className="text-xs text-blue-700/80">Multi-dimensional semantic intelligence</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2.5 py-1 rounded-full">
                  Autonomous
                </span>
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="divide-y divide-slate-100">
              {[
                {
                  feature: 'Screening Methodology',
                  traditional: 'Literal keyword matching. Rejects qualified talent who use alternative phrasing while rewarding keyword stuffing.',
                  uppshot: 'Deep semantic evaluation. Analyzes core competencies, verified career longevity, project outcomes, and role readiness in context.',
                },
                {
                  feature: 'Screening Speed',
                  traditional: '40+ hours of manual resume scanning per requisition; 6–8 seconds of rushed human reading per candidate.',
                  uppshot: 'Under 3 seconds per candidate. Screen, rank, and organize 100+ resumes into an actionable shortlist in under 60 seconds.',
                },
                {
                  feature: 'Candidate Intake',
                  traditional: 'Manual email inboxes flooded with unparsed PDFs or tedious multi-page job application portals.',
                  uppshot: '1-Click LinkedIn-ready public career links. Fast, frictionless mobile application flow with instant screening upon submission.',
                },
                {
                  feature: 'Anti-Cheat & Fraud Prevention',
                  traditional: 'Zero identity verification. Highly vulnerable to bot applications, duplicate spam, and fabricated credentials.',
                  uppshot: 'Verified Google SSO & GitHub OAuth authentication locks applicant identity and eliminates duplicate spam submissions.',
                },
                {
                  feature: 'Bulk File Ingestion',
                  traditional: 'Uploading files one by one with manual data re-entry and high error rates.',
                  uppshot: 'Bulk drop 100+ resumes via nested ZIP archives or 1-click cloud sync directly from Google Drive and OneDrive.',
                },
                {
                  feature: 'Scoring Transparency',
                  traditional: 'Black-box arbitrary filter percentages with zero breakdown, rationale, or interview guidance.',
                  uppshot: 'Explainable 0–100% scorecards with dimensional breakdowns, key strengths, skill gaps, and custom technical interview questions.',
                },
                {
                  feature: 'Pricing & Commitment',
                  traditional: 'Locked annual contracts ($8,000–$25,000/yr), mandatory onboarding fees, and per-seat license taxes.',
                  uppshot: 'Transparent pay-as-you-go credit wallet from ₹0.79/candidate. 10 free credits to start, zero subscription lock-in.',
                },
                {
                  feature: 'Data Sovereignty & Privacy',
                  traditional: 'Resumes stored indefinitely across unencrypted third-party disks with ambiguous data usage terms.',
                  uppshot: 'Zero AI foundation model training. Candidate data is strictly isolated with instant permanent cascade deletion upon request.',
                },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 hover:bg-slate-50/40 transition-colors">
                  {/* Traditional side */}
                  <div className="p-4 sm:p-5 md:border-r border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block md:hidden">
                      {row.feature} — Traditional ATS
                    </span>
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs mt-0.5 font-bold">
                        ✕
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800 font-semibold">{row.feature}:</strong> {row.traditional}
                      </p>
                    </div>
                  </div>

                  {/* Uppshot side */}
                  <div className="p-4 sm:p-5 bg-blue-50/20 md:bg-transparent space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block md:hidden">
                      {row.feature} — Uppshot
                    </span>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {row.uppshot}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEO Friendly FAQ Section with Interactive Accordions */}
        <section id="faq" className="text-left mb-24 pt-12 border-t border-slate-200/80 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <HelpCircle size={14} className="text-blue-600" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Common Questions About AI Resume Screening
            </h2>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              Find answers to the most common questions regarding automated candidate screening, data privacy, ATS keyword matching, and recruitment efficiency.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div
                  key={faq.q}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl shadow-xs transition-all duration-200 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none"
                  >
                    <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <ChevronDown size={18} />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${idx}`}
                      className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fade-in"
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Support Link */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Have a question that is not covered here?{' '}
              <Link to="/contact" className="text-blue-600 font-semibold hover:underline">
                Contact our recruitment engineering team
              </Link>{' '}
              for specialized deployment guidance.
            </p>
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
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <BrandLogo className="w-7 h-7" />
                <span className="font-bold text-slate-900 text-base">Uppshot</span>
              </Link>
              <span className="hidden sm:inline text-slate-300">•</span>
              <p className="text-xs text-slate-500">
                Precision AI recruitment intelligence for modern hiring teams.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#comparison" className="hover:text-blue-600 transition-colors">Comparison</a>
              <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
              <Link to="/developer-docs" className="hover:text-blue-600 transition-colors">Developer API</Link>
              <Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
              <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-slate-400">
            <div className="text-[11px]">
              © {new Date().getFullYear()} Uppshot. Operated by Artificial Grrow. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px]">
              <Link to="/privacy" className="text-slate-500 hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/terms" className="text-slate-500 hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
              <span className="text-slate-300">•</span>
              <Link to="/refund-policy" className="text-slate-500 hover:text-blue-600 transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

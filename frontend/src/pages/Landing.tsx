import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Share2, Layers,
  Cpu, Zap, Star, Lock, Eye, Server, RefreshCw, FileText, AlertCircle,
  ShieldAlert, Menu, X, Building2, Mail, ChevronDown, HelpCircle,
  Target, Clock, BarChart3, Database, Search
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
    a: 'Uppshot adheres to an enterprise-grade In-Memory Zero-Disk architecture. Resumes are processed in transient memory streams without persistent caching on unencrypted disks. Furthermore, candidate personal data and resume content are strictly confidential and NEVER used to train, retrain, or fine-tune public foundation AI models (such as OpenAI or Azure models). Recruiters can also trigger permanent cascade deletion of candidate records at any time.',
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
    a: 'Human screening can unintentionally be influenced by cognitive shortcuts, formatting styles, school prestige, or demographic indicators. Uppshot evaluates applicants strictly against objective job parameters: core technical proficiencies, project depth, role longevity, and measurable impact, fostering a transparent, merit-first shortlisting process.',
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">
              Upp<span className="text-blue-600">shot</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              About Us
            </Link>
            <a href="#features" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#overview" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              AI Guide & Tech
            </a>
            <a href="#faq" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              FAQ
            </a>
            <Link to="/contact" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Contact
            </Link>
            <Link to="/privacy" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Terms
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
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all"
            >
              <Target size={16} className="text-blue-600" />
              <span>AI Guide & Tech</span>
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

        {/* 1000-Word SEO In-Depth Guide & Architecture Overview Section */}
        <section id="overview" className="text-left mb-24 pt-12 border-t border-slate-200/80 scroll-mt-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <Target size={14} className="text-blue-600" />
              <span>Enterprise Recruitment Intelligence Standard</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              The Modern Standard for AI Resume Screening Software
            </h2>
            <p className="text-slate-600 text-sm mt-3 leading-relaxed">
              How next-generation semantic candidate matching, explainable AI scoring, and automated applicant ranking transform hiring efficiency for modern recruitment teams.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Card 1: Shift & Legacy ATS Flaws */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                1. The Modern Hiring Dilemma & Why Legacy ATS Filters Fail
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Modern talent acquisition teams face an unprecedented operational bottleneck: the sheer volume of inbound job applications. The proliferation of one-click job applications on professional networks such as LinkedIn and automated career aggregators has generated a deluge of applicants for every open requisition. Corporate recruiters and talent acquisition leaders routinely receive between 300 and 1,500 resumes for a single technical or executive position. However, industry benchmarking indicates that up to 75% to 88% of these applicants do not satisfy the minimum core qualifications required for the role.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Historically, recruiting teams had only two undesirable options. The first was manual resume screening, where human recruiters spend an average of six to eight seconds scanning each curriculum vitae—requiring over 40 recruiter hours merely to assemble an initial shortlist. The second was legacy automated filters built on literal string matching and Boolean keyword search. For example, if a job description specifies experience with "Kubernetes orchestration," an applicant with seven years of deep containerization experience who describes their background using "K8s cluster management and microservice autoscaling" might be assigned a zero score or rejected by a legacy ATS parser. Conversely, underqualified candidates frequently utilize "keyword stuffing" to exploit simplistic scoring heuristics.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Uppshot eliminates this failure mode entirely.</strong> As an advanced <span className="text-blue-700 font-semibold">AI resume screening software</span> and <span className="text-blue-700 font-semibold">automated resume screening tool</span>, Uppshot utilizes state-of-the-art Natural Language Processing (NLP) and contextual large language models (LLMs) to analyze conceptual depth, project scope, and technical coherence rather than superficial words.
              </p>
            </div>

            {/* Card 2: Multi-Dimensional Evaluation */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <BarChart3 size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                2. Multi-Dimensional Semantic Evaluation: How Uppshot Scores Talent
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rather than reducing a candidate to a single arbitrary percentage or a binary keyword match, Uppshot evaluates every applicant across four rigorous, customizable evaluation dimensions designed to mirror the holistic judgment of a senior engineering manager or talent partner:
              </p>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                <li>
                  <strong>Technical Depth & Core Competency:</strong> Analyzes the substantive proficiency of the candidate's reported skill stack, distinguishing between superficial mentions of frameworks and hands-on architecture, production deployment, and system maintenance.
                </li>
                <li>
                  <strong>Relevant Experience Duration & Career Trajectory:</strong> Measures verified career longevity, progressive role promotion, tenure consistency, and how closely past industry experience aligns with the specific seniority of the open position.
                </li>
                <li>
                  <strong>Project Complexity & Measurable Impact:</strong> Examines the scale, technical difficulty, and quantifiable business outcomes achieved in previous initiatives (such as latency reductions, distributed system scaling, or team leadership).
                </li>
                <li>
                  <strong>Role & Team Compatibility:</strong> Evaluates how well the applicant's domain familiarity, methodology exposure (e.g., Agile, CI/CD, microservices, regulatory compliance), and cross-functional leadership fit the operational demands of the hiring team.
                </li>
              </ul>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each applicant receives an objective, normalized composite score from 0 to 100%, accompanied by an <span className="text-blue-700 font-semibold">explainable AI scorecard</span> that outlines key strengths, identified skill gaps, and custom technical interview questions tailored specifically to their resume. This empowers talent partners to execute <span className="text-blue-700 font-semibold">unbiased AI talent evaluation</span> across diverse applicant pools.
              </p>
            </div>

            {/* Card 3: Privacy & Zero-Disk Architecture */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Database size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                3. Architectural Sovereignty: In-Memory Stream Processing & Absolute Data Privacy
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enterprise recruitment involves highly confidential candidate information, including contact details, compensation history, employment timelines, and proprietary portfolio assets. Legacy recruitment software frequently stores unencrypted resume files across third-party disks, creating compliance liabilities and data leakage risks.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uppshot is engineered from the ground up with an uncompromising <strong>In-Memory Zero-Disk Architecture</strong>. When candidates submit resumes via public links or recruiters upload documents in bulk (including nested ZIP archives, Google Drive links, and OneDrive shares), the files are streamed and evaluated dynamically in volatile RAM. No unencrypted document caches or temporary scratch files linger on disk storage.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Furthermore, Uppshot enforces strict corporate data sovereignty: candidate resumes and evaluation prompts are <strong>never utilized to train, retrain, or fine-tune public foundation AI models</strong> (such as OpenAI or Azure models). Recruiters retain complete data ownership, with instantaneous cascade deletion capabilities that permanently purge candidate records and scores upon request.
              </p>
            </div>

            {/* Card 4: Intake, Webhooks & Economics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                4. Direct Candidate Intake, Real-Time Webhooks & Pay-As-You-Go Economics
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A significant challenge in talent acquisition is the disconnect between outbound recruitment campaigns and candidate intake. Recruiters often advertise openings on LinkedIn, professional communities, or Slack groups, only to receive a disorganized flood of emails and unparsed documents.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uppshot bridges this gap with one-click LinkedIn-ready public career links. Recruiters generate a dedicated, high-converting application page for any job posting in seconds. To eliminate fraudulent duplicate applications and bot attacks, Uppshot incorporates anti-cheat OAuth verification: applicants authenticate with their verified Google or GitHub credentials before submitting their resume. This locks application integrity, verifies candidate identity, and ensures that every submission in your recruiter studio is genuine.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unlike legacy enterprise platforms that lock organizations into rigid annual contracts ranging from $8,000 to over $25,000 annually with mandatory onboarding fees, Uppshot operates on a transparent, <strong>pay-as-you-go credit wallet model</strong> (scaling as low as ₹0.79 per candidate screened). Every newly registered recruiter receives 10 complimentary screening credits immediately upon signup, with zero recurring subscription locks.
              </p>
            </div>
          </div>

          {/* Business Impact Banner */}
          <div className="mt-8 p-6 sm:p-8 bg-gradient-to-r from-blue-50 via-white to-sky-50 border border-blue-200/80 rounded-2xl max-w-5xl mx-auto shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md">
                  Measurable Operational ROI
                </span>
                <h4 className="text-xl font-extrabold text-slate-900">
                  Slashing Time-to-Hire by 10x with High-Fidelity Accuracy
                </h4>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  By automating the most labor-intensive phase of the hiring funnel, Uppshot delivers transformative operational improvements for recruitment organizations. Benchmarked customer deployments demonstrate an average 10x reduction in resume triage duration: an inbound batch of 200 candidates that previously consumed 16 hours of recruiter review is screened, ranked, and organized into actionable shortlists in under 60 seconds. This rapid turnaround slashes time-to-first-interview from twelve days down to under 48 hours, enabling hiring teams to capture premier industry talent before competitors.
                </p>
              </div>
              <Link
                to="/login"
                className="shrink-0 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center gap-1.5"
              >
                <span>Experience Semantic AI</span>
                <ArrowRight size={14} />
              </Link>
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
      <footer className="relative z-10 border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">Uppshot</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>Precision AI Recruitment Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
            <Link to="/about" className="hover:text-blue-600 transition-colors font-medium text-slate-700">About Us</Link>
            <Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link>
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-blue-600 transition-colors">Refund Policy</Link>
            <Link to="/developer-docs" className="hover:text-blue-600 transition-colors">Developer API</Link>
          </div>
          <div className="text-slate-400">© {new Date().getFullYear()} Uppshot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}

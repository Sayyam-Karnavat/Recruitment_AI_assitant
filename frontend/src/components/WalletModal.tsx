import React, { useState, useEffect } from 'react'
import {
  X, CreditCard, ShieldCheck, CheckCircle2, History, Sparkles, Crown,
  AlertCircle, RefreshCw, Zap, Building, Check, ArrowRight, FileText
} from 'lucide-react'
import { useWallet, WalletPackage } from '../context/WalletContext'
import api from '../services/api'

interface Transaction {
  id: string
  amount_credits: number
  amount_inr: number
  transaction_type: string
  status: string
  reference_id: string
  description: string
  created_at: string
}

declare global {
  interface Window { Razorpay: any }
}

type Tab = 'prepaid' | 'payg' | 'history'

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  const ok = type === 'success'
  return (
    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fade-in ${
      ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
      <span>{msg}</span>
    </div>
  )
}

export default function WalletModal() {
  const {
    credits, packages,
    razorpayKeyId, isUnlimited, userEmail,
    billingMode, cardLast4, cardNetwork, paygDetails,
    isWalletModalOpen, closeWalletModal, refreshBalance
  } = useWallet()

  const [tab, setTab] = useState<Tab>(billingMode === 'payg_monthly' ? 'payg' : 'prepaid')
  const isVip = isUnlimited || userEmail === 'sanyam.karnavat5@gmail.com'

  // Sync tab when modal opens or billingMode changes
  useEffect(() => {
    if (isWalletModalOpen) {
      if (billingMode === 'payg_monthly') {
        setTab('payg')
      }
    }
  }, [isWalletModalOpen, billingMode])

  // Prepaid Top-up state
  const [selectedPkgId, setSelectedPkgId] = useState('tier_500')
  const [topupProcessing, setTopupProcessing] = useState(false)
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null)
  const [topupError, setTopupError] = useState<string | null>(null)

  // PAYG state
  const [paygContact, setPaygContact] = useState('')
  const [paygProcessing, setPaygProcessing] = useState(false)
  const [paygSuccess, setPaygSuccess] = useState<string | null>(null)
  const [paygError, setPaygError] = useState<string | null>(null)
  const [disablingPayg, setDisablingPayg] = useState(false)
  const [settlingCycle, setSettlingCycle] = useState(false)
  const [switchingMode, setSwitchingMode] = useState(false)

  // History
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null)

  useEffect(() => {
    if (tab === 'history' && isWalletModalOpen) {
      setLoadingTx(true)
      api.get('/wallet/transactions')
        .then(r => setTransactions(r.data))
        .catch(() => {})
        .finally(() => setLoadingTx(false))
    }
  }, [tab, isWalletModalOpen])

  if (!isWalletModalOpen) return null

  const selectedPkg = packages.find(p => p.id === selectedPkgId) || packages[1] || packages[0]

  // ── Prepaid Checkout (One-Time Top-Up) ──────────────────────────────────
  const handleTopupCheckout = async () => {
    if (!selectedPkg || !razorpayKeyId) { setTopupError('Payment gateway not configured.'); return }
    setTopupProcessing(true); setTopupError(null); setTopupSuccess(null)
    try {
      const { data: ord } = await api.post('/wallet/create-order', { package_id: selectedPkg.id })
      if (!await loadRazorpayScript()) throw new Error('Failed to load Razorpay payment SDK.')
      const rzp = new window.Razorpay({
        key: ord.key_id, amount: ord.amount, currency: ord.currency,
        name: 'Uppshot Recruitment Platform', description: ord.description, order_id: ord.order_id,
        handler: async (res: any) => {
          try {
            const { data } = await api.post('/wallet/verify-payment', {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            })
            setTopupSuccess(data.message || `✅ ${data.credits_added} credits added successfully!`)
            await refreshBalance()
          } catch (e: any) { setTopupError(e.response?.data?.detail || 'Payment verification failed.') }
          finally { setTopupProcessing(false) }
        },
        modal: { ondismiss: () => setTopupProcessing(false) },
        theme: { color: '#2563eb' },
      })
      rzp.open()
    } catch (e: any) {
      setTopupError(e.response?.data?.detail || e.message || 'Payment initiation failed.')
      setTopupProcessing(false)
    }
  }

  // ── Corporate Card Link (Razorpay Mandate Authorization) ────────────────
  const handleLinkCorporateCard = async () => {
    if (!razorpayKeyId) { setPaygError('Payment gateway is not configured.'); return }
    setPaygProcessing(true); setPaygError(null); setPaygSuccess(null)
    try {
      const { data: ord } = await api.post('/wallet/payg/create-mandate-order', {
        contact: paygContact || '9876543210'
      })
      if (!await loadRazorpayScript()) throw new Error('Failed to load Razorpay SDK.')
      const rzp = new window.Razorpay({
        key: ord.key_id,
        amount: ord.amount,
        currency: ord.currency,
        order_id: ord.order_id,
        customer_id: ord.customer_id,
        recurring: 1,
        name: 'Uppshot — Pay-As-You-Go',
        description: 'Authorize Corporate Card for Monthly Postpaid Billing',
        handler: async (res: any) => {
          try {
            const { data } = await api.post('/wallet/payg/verify-mandate', {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              razorpay_customer_id: ord.customer_id,
              razorpay_token_id: res.razorpay_token || null,
            })
            setPaygSuccess(data.message || 'Corporate Card linked! Pay-As-You-Go Monthly is now active.')
            await refreshBalance()
          } catch (e: any) {
            setPaygError(e.response?.data?.detail || 'Mandate verification failed.')
          } finally {
            setPaygProcessing(false)
          }
        },
        modal: { ondismiss: () => setPaygProcessing(false) },
        theme: { color: '#059669' },
      })
      rzp.open()
    } catch (e: any) {
      setPaygError(e.response?.data?.detail || e.message || 'Could not initiate card mandate.')
      setPaygProcessing(false)
    }
  }

  // ── Switch Billing Mode Self-Service ────────────────────────────────────
  const handleSwitchMode = async (targetMode: 'prepaid' | 'payg_monthly') => {
    setSwitchingMode(true); setPaygError(null); setPaygSuccess(null)
    try {
      await api.post('/wallet/switch-mode', { mode: targetMode })
      await refreshBalance()
      if (targetMode === 'prepaid') {
        setPaygSuccess('Switched to Prepaid Credits.')
        setTab('prepaid')
      } else {
        setPaygSuccess('Switched to Pay-As-You-Go Monthly.')
        setTab('payg')
      }
    } catch (e: any) {
      setPaygError(e.response?.data?.detail || 'Failed to switch billing mode.')
    } finally {
      setSwitchingMode(false)
    }
  }

  // ── Unlink Card ─────────────────────────────────────────────────────────
  const handleUnlinkCard = async () => {
    if (!window.confirm('Unlink this corporate card? Your account will switch back to Prepaid Credits.')) return
    setDisablingPayg(true); setPaygError(null); setPaygSuccess(null)
    try {
      const { data } = await api.delete('/wallet/payg/mandate')
      setPaygSuccess(data.message || 'Corporate card unlinked.')
      await refreshBalance()
      setTab('prepaid')
    } catch (e: any) {
      setPaygError(e.response?.data?.detail || 'Failed to unlink corporate card.')
    } finally {
      setDisablingPayg(false)
    }
  }

  // ── Settle Month Cycle On-Demand ────────────────────────────────────────
  const handleSettleCycle = async () => {
    const cost = paygDetails?.current_accrued_inr || 0
    if (cost <= 0) {
      alert('No unbilled screening usage in the current cycle.')
      return
    }
    if (!window.confirm(`Settle and charge current accrued invoice of ₹${cost} to your card now?`)) return
    setSettlingCycle(true); setPaygError(null); setPaygSuccess(null)
    try {
      const { data } = await api.post('/wallet/payg/settle-cycle')
      setPaygSuccess(data.message || 'Invoice charged and cycle settled successfully.')
      await refreshBalance()
    } catch (e: any) {
      setPaygError(e.response?.data?.detail || 'Failed to settle billing cycle.')
    } finally {
      setSettlingCycle(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              billingMode === 'payg_monthly'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              {billingMode === 'payg_monthly' ? <CreditCard className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Billing & Subscriptions</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  billingMode === 'payg_monthly'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {billingMode === 'payg_monthly' ? 'Pay-As-You-Go' : 'Prepaid'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Fixed rate: ₹0.79 / resume screened across all plans</p>
            </div>
          </div>
          <button onClick={closeWalletModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between flex-shrink-0 ${
          billingMode === 'payg_monthly'
            ? 'bg-gradient-to-r from-emerald-50/80 via-slate-50 to-teal-50/70 border-emerald-200/80'
            : 'bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/70 border-slate-200/80'
        }`}>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {billingMode === 'payg_monthly' ? 'Current Monthly Usage' : 'Available Balance'}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              {isVip ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">Unlimited</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-mono font-bold">∞ VIP</span>
                </div>
              ) : billingMode === 'payg_monthly' ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {paygDetails?.screened_this_cycle || 0}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">resumes screened</span>
                  <span className="text-xs font-medium text-slate-400">
                    (₹{paygDetails?.current_accrued_inr?.toFixed(2) || '0.00'} accrued)
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">{credits.toLocaleString()}</span>
                  <span className="text-xs font-bold text-blue-600">Credits</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {billingMode === 'payg_monthly' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                {cardNetwork || 'Card'} •••• {cardLast4 || 'Active'}
              </span>
            ) : (
              <button
                onClick={() => setTab('payg')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200 transition-colors"
              >
                <Zap className="w-3 h-3 text-blue-600" />
                Switch to Pay-As-You-Go
              </button>
            )}
            {isVip && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                <Crown className="w-2.5 h-2.5 text-amber-600" />VIP Master
              </span>
            )}
          </div>
        </div>

        {/* Workflow Selector Tabs */}
        <div className="flex border-b border-slate-100 px-5 gap-3 flex-shrink-0 bg-slate-50/50">
          {[
            {
              id: 'prepaid' as Tab,
              label: 'Prepaid Packs',
              icon: <Sparkles className="w-3.5 h-3.5" />,
              badge: billingMode === 'prepaid' ? 'Active' : undefined
            },
            {
              id: 'payg' as Tab,
              label: 'Pay-As-You-Go (Monthly)',
              icon: <CreditCard className="w-3.5 h-3.5" />,
              badge: billingMode === 'payg_monthly' ? 'Active' : 'Corporate'
            },
            {
              id: 'history' as Tab,
              label: 'Invoices & Receipts',
              icon: <History className="w-3.5 h-3.5" />
            },
          ].map(({ id, label, icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                tab === id
                  ? id === 'payg'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {icon}
              <span>{label}</span>
              {badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                  badge === 'Active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto flex-1 bg-white">

          {/* TAB 1: PREPAID PACKS */}
          {tab === 'prepaid' && (
            <div className="p-5 space-y-4">
              {billingMode === 'payg_monthly' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Your account is on <strong>Pay-As-You-Go</strong>. Resumes are billed to your corporate card.</span>
                  </div>
                  <button
                    onClick={() => handleSwitchMode('prepaid')}
                    disabled={switchingMode}
                    className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                  >
                    {switchingMode ? 'Switching...' : 'Switch to Prepaid'}
                  </button>
                </div>
              )}

              {isVip && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-600" />Unlimited Access Active — {userEmail}</p>
                </div>
              )}

              {!razorpayKeyId && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Configure <code>RAZORPAY_KEY_ID</code> & <code>RAZORPAY_KEY_SECRET</code> in backend environment to enable live payments.</span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Choose a Prepaid Credit Package</p>
                <p className="text-[11px] text-slate-500">1 Credit = 1 Resume Screened. Credits never expire.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg: WalletPackage) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      selectedPkgId === pkg.id
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {pkg.id === 'tier_500' && (
                      <span className="absolute -top-2 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Popular
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-900">{pkg.credits.toLocaleString()} Credits</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-black text-slate-900 font-mono">₹{pkg.amount_inr}</span>
                      <span className="text-[10px] text-slate-400 font-medium">(₹{pkg.cost_per_credit} / resume)</span>
                    </div>
                  </div>
                ))}
              </div>

              {topupSuccess && <Alert type="success" msg={topupSuccess} />}
              {topupError && <Alert type="error" msg={topupError} />}

              <button
                onClick={handleTopupCheckout}
                disabled={topupProcessing || !razorpayKeyId}
                className="btn btn-primary w-full py-3 text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {topupProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Opening Checkout...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Top Up {selectedPkg?.credits.toLocaleString()} Credits — ₹{selectedPkg?.amount_inr}
                  </span>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HMAC SHA-256 Verified · Instant Delivery · UPI / Cards / Netbanking</span>
              </div>
            </div>
          )}

          {/* TAB 2: CORPORATE PAY-AS-YOU-GO */}
          {tab === 'payg' && (
            <div className="p-5 space-y-4">
              {billingMode === 'payg_monthly' ? (
                /* Card Already Linked & Active */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-950">
                            {cardNetwork || 'Corporate Card'} •••• {cardLast4 || '4242'}
                          </p>
                          <p className="text-[11px] text-emerald-700">Pay-As-You-Go Monthly Billing Active</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Autopay Enabled
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60">
                      <div className="bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Screened This Cycle</span>
                        <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                          {paygDetails?.screened_this_cycle || 0} <span className="text-xs font-normal text-slate-500">resumes</span>
                        </p>
                      </div>
                      <div className="bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Accrued Invoice</span>
                        <p className="text-base font-black text-emerald-700 font-mono mt-0.5">
                          ₹{paygDetails?.current_accrued_inr?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex justify-between items-center px-1">
                      <span>Rate: <strong>₹0.79 / resume</strong></span>
                      <span>Next Invoice: <strong>{paygDetails?.cycle_end ? new Date(paygDetails.cycle_end).toLocaleDateString() : 'End of Month'}</strong></span>
                    </div>
                  </div>

                  {paygSuccess && <Alert type="success" msg={paygSuccess} />}
                  {paygError && <Alert type="error" msg={paygError} />}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleSettleCycle}
                      disabled={settlingCycle || (paygDetails?.screened_this_cycle || 0) === 0}
                      className="py-2.5 px-3 rounded-xl border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      {settlingCycle ? 'Settling...' : 'Settle Invoice Now'}
                    </button>
                    <button
                      onClick={() => handleSwitchMode('prepaid')}
                      disabled={switchingMode}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {switchingMode ? 'Switching...' : 'Switch to Prepaid Packs'}
                    </button>
                  </div>

                  <button
                    onClick={handleUnlinkCard}
                    disabled={disablingPayg}
                    className="w-full py-2 text-[11px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 disabled:opacity-50"
                  >
                    {disablingPayg ? 'Unlinking...' : 'Unlink Corporate Card'}
                  </button>
                </div>
              ) : (
                /* Link Corporate Card Workflow */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900">How Corporate Pay-As-You-Go Works</h4>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Zero Credit Interruptions:</strong> Screen thousands of resumes without pre-purchasing credit packages.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Standard Pegged Pricing:</strong> Exactly <strong>₹0.79 / resume</strong> screened — pay only for actual usage.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span><strong>Monthly Consolidated Billing:</strong> Automatically charged to your linked card at the end of each 30-day cycle.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span><strong>RBI e-Mandate Compliant:</strong> Quick 1-time ₹2 refundable card verification via Razorpay Cards Recurring.</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Billing Contact Mobile (for Card Mandate OTP)
                    </label>
                    <input
                      type="tel"
                      value={paygContact}
                      onChange={e => setPaygContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                    />
                  </div>

                  {paygSuccess && <Alert type="success" msg={paygSuccess} />}
                  {paygError && <Alert type="error" msg={paygError} />}

                  <button
                    onClick={handleLinkCorporateCard}
                    disabled={paygProcessing || !razorpayKeyId}
                    className="w-full py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paygProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Opening Card Authorization...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Link Corporate Card & Activate Pay-As-You-Go
                      </span>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cards Recurring Active · Visa, MasterCard, RuPay · Cancel Anytime</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BILLING & HISTORY */}
          {tab === 'history' && (
            <div className="p-5">
              {loadingTx ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No transactions recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-3">
                        <p className="font-bold text-slate-800 truncate">{tx.description || tx.transaction_type}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(tx.created_at).toLocaleDateString()} · {tx.reference_id ? `${tx.reference_id.slice(0, 16)}...` : 'SYS'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right font-mono font-bold">
                          {tx.amount_credits !== 0 && (
                            <span className={tx.amount_credits > 0 ? 'text-emerald-600' : 'text-slate-700'}>
                              {tx.amount_credits > 0 ? `+${tx.amount_credits}` : tx.amount_credits} credits
                            </span>
                          )}
                          {tx.amount_inr > 0 && (
                            <p className="text-[10px] text-slate-500 font-medium">₹{tx.amount_inr}</p>
                          )}
                        </div>
                        {(tx.transaction_type === 'purchase' || tx.transaction_type === 'payg_settlement') && tx.amount_inr > 0 && (
                          <button
                            onClick={() => setSelectedReceiptTx(tx)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tax Invoice / Receipt Modal */}
      {selectedReceiptTx && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">R</div>
                <span className="font-bold text-sm text-slate-900">Payment Invoice & Receipt</span>
              </div>
              <button
                onClick={() => setSelectedReceiptTx(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600">
              {[
                ['Invoice Reference', selectedReceiptTx.reference_id || selectedReceiptTx.id],
                ['Date & Time', new Date(selectedReceiptTx.created_at).toLocaleString()],
                ['Billed Client Account', userEmail],
                ['Service Description', 'IT Software & AI Resume Screening (SAC 998313)'],
                ['Payment Method', 'Razorpay Online Gateway (Cards Recurring / Mandate)'],
                ['Status', '✅ Paid & Verified'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-400 flex-shrink-0">{label}:</span>
                  <span className="font-medium text-slate-800 text-right truncate">{val}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Resumes / Credits:</span>
                <span className="font-mono font-black text-blue-600 text-sm">
                  {selectedReceiptTx.amount_credits > 0 ? `+${selectedReceiptTx.amount_credits} credits` : 'Pay-As-You-Go Monthly Settlement'}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Total Paid:</span>
                <span className="font-mono font-black text-slate-900 text-base">₹{selectedReceiptTx.amount_inr}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setSelectedReceiptTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

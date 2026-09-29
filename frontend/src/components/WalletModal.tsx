import React, { useState, useEffect } from 'react'
import {
  X, CreditCard, ShieldCheck, CheckCircle2, History, Sparkles, Crown,
  AlertCircle, RefreshCw, ToggleRight, Zap, Calendar, Phone
} from 'lucide-react'
import { useWallet, WalletPackage, SubscriptionPlan } from '../context/WalletContext'
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

type Tab = 'topup' | 'subscription' | 'payg' | 'history'

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
    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fade-in ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
      <span>{msg}</span>
    </div>
  )
}

export default function WalletModal() {
  const {
    credits, packages, subscriptionPlans, activeSubscription, paygMandate,
    razorpayKeyId, isUnlimited, userEmail,
    isWalletModalOpen, closeWalletModal, refreshBalance
  } = useWallet()

  const [tab, setTab] = useState<Tab>('topup')
  const isVip = isUnlimited || userEmail === 'sanyam.karnavat5@gmail.com'

  // Top-up state
  const [selectedPkgId, setSelectedPkgId] = useState('tier_500')
  const [topupProcessing, setTopupProcessing] = useState(false)
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null)
  const [topupError, setTopupError] = useState<string | null>(null)

  // Subscription state
  const [selectedPlanId, setSelectedPlanId] = useState('sub_growth')
  const [subProcessing, setSubProcessing] = useState(false)
  const [subSuccess, setSubSuccess] = useState<string | null>(null)
  const [subError, setSubError] = useState<string | null>(null)
  const [cancellingPlan, setCancellingPlan] = useState(false)

  // PAYG state
  const [paygPkgId, setPaygPkgId] = useState('tier_100')
  const [paygThreshold, setPaygThreshold] = useState(5)
  const [paygContact, setPaygContact] = useState('')
  const [paygProcessing, setPaygProcessing] = useState(false)
  const [paygSuccess, setPaygSuccess] = useState<string | null>(null)
  const [paygError, setPaygError] = useState<string | null>(null)
  const [disablingPayg, setDisablingPayg] = useState(false)

  // History
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null)

  useEffect(() => {
    if (tab === 'history' && isWalletModalOpen) {
      setLoadingTx(true)
      api.get('/wallet/transactions').then(r => setTransactions(r.data)).catch(() => {}).finally(() => setLoadingTx(false))
    }
  }, [tab, isWalletModalOpen])

  if (!isWalletModalOpen) return null

  const selectedPkg = packages.find(p => p.id === selectedPkgId) || packages[1] || packages[0]
  const selectedPlan = subscriptionPlans.find(p => p.id === selectedPlanId)
  const paygPkg = packages.find(p => p.id === paygPkgId) || packages[0]

  // ── One-time checkout ──────────────────────────────────────────────────
  const handleTopupCheckout = async () => {
    if (!selectedPkg || !razorpayKeyId) { setTopupError('Payment gateway not configured.'); return }
    setTopupProcessing(true); setTopupError(null); setTopupSuccess(null)
    try {
      const { data: ord } = await api.post('/wallet/create-order', { package_id: selectedPkg.id })
      if (!await loadRazorpayScript()) throw new Error('Failed to load payment SDK.')
      const rzp = new window.Razorpay({
        key: ord.key_id, amount: ord.amount, currency: ord.currency,
        name: 'Uppshot Platform', description: ord.description, order_id: ord.order_id,
        handler: async (res: any) => {
          try {
            const { data } = await api.post('/wallet/verify-payment', {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            })
            setTopupSuccess(data.message || `✅ ${data.credits_added} credits added!`)
            await refreshBalance()
          } catch (e: any) { setTopupError(e.response?.data?.detail || 'Verification failed.') }
          finally { setTopupProcessing(false) }
        },
        modal: { ondismiss: () => setTopupProcessing(false) },
        theme: { color: '#2563eb' },
      })
      rzp.open()
    } catch (e: any) { setTopupError(e.response?.data?.detail || e.message || 'Payment initiation failed.'); setTopupProcessing(false) }
  }

  // ── Subscription ──────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!selectedPlan?.available || !razorpayKeyId) { setSubError(!razorpayKeyId ? 'Gateway not configured.' : 'Plan not available.'); return }
    setSubProcessing(true); setSubError(null); setSubSuccess(null)
    try {
      const { data: subData } = await api.post('/wallet/create-subscription', { plan_id: selectedPlan.id })
      if (!await loadRazorpayScript()) throw new Error('Failed to load payment SDK.')
      const rzp = new window.Razorpay({
        key: subData.key_id, subscription_id: subData.subscription_id,
        name: 'Uppshot Platform', description: subData.label,
        handler: async () => {
          setSubSuccess(`🎉 Subscribed to ${subData.label}! Credits added on first charge via webhook.`)
          await refreshBalance(); setSubProcessing(false)
        },
        modal: { ondismiss: () => setSubProcessing(false) },
        theme: { color: '#7c3aed' },
      })
      rzp.open()
    } catch (e: any) { setSubError(e.response?.data?.detail || e.message || 'Subscription failed.'); setSubProcessing(false) }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancel subscription? Credits remain until end of billing period.')) return
    setCancellingPlan(true)
    try { const { data } = await api.delete('/wallet/subscription'); setSubSuccess(data.message); await refreshBalance() }
    catch (e: any) { setSubError(e.response?.data?.detail || 'Failed to cancel.') }
    finally { setCancellingPlan(false) }
  }

  // ── PAYG ──────────────────────────────────────────────────────────────
  const handlePaygSetup = async () => {
    if (!razorpayKeyId) { setPaygError('Gateway not configured.'); return }
    if (!paygContact || !/^\d{10}$/.test(paygContact)) { setPaygError('Enter a valid 10-digit mobile number.'); return }
    setPaygProcessing(true); setPaygError(null); setPaygSuccess(null)
    try {
      const { data: ord } = await api.post('/wallet/payg/create-mandate-order', { package_id: paygPkgId, threshold: paygThreshold, contact: paygContact })
      if (!await loadRazorpayScript()) throw new Error('Failed to load payment SDK.')
      const rzp = new window.Razorpay({
        key: ord.key_id, amount: ord.amount, currency: ord.currency,
        order_id: ord.order_id, customer_id: ord.customer_id, recurring: 1,
        name: 'Uppshot — Auto Top-Up Setup',
        description: `Save card for auto-recharge when credits < ${ord.threshold}`,
        handler: async (res: any) => {
          try {
            const { data } = await api.post('/wallet/payg/verify-mandate', {
              razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature, razorpay_customer_id: ord.customer_id,
              razorpay_token_id: res.razorpay_token || null,
            })
            setPaygSuccess(data.message); await refreshBalance()
          } catch (e: any) { setPaygError(e.response?.data?.detail || 'PAYG verification failed.') }
          finally { setPaygProcessing(false) }
        },
        modal: { ondismiss: () => setPaygProcessing(false) },
        theme: { color: '#059669' },
      })
      rzp.open()
    } catch (e: any) { setPaygError(e.response?.data?.detail || e.message || 'PAYG setup failed.'); setPaygProcessing(false) }
  }

  const handleDisablePayg = async () => {
    if (!window.confirm('Disable auto top-up?')) return
    setDisablingPayg(true)
    try { await api.delete('/wallet/payg/mandate'); setPaygSuccess('Auto top-up disabled.'); await refreshBalance() }
    catch (e: any) { setPaygError(e.response?.data?.detail || 'Failed.') }
    finally { setDisablingPayg(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Wallet & Credits</h3>
              <p className="text-xs text-slate-500">1 Credit = 1 Resume AI Screened</p>
            </div>
          </div>
          <button onClick={closeWalletModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance banner */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Balance</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              {isVip ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">Unlimited</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-mono font-bold">∞ VIP</span>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-900 font-mono">{credits.toLocaleString()}</span>
                  <span className="text-xs font-bold text-blue-600">Credits</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {activeSubscription && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
                <RefreshCw className="w-2.5 h-2.5" />Auto-renewing
              </span>
            )}
            {paygMandate?.is_active && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                <Zap className="w-2.5 h-2.5" />PAYG Active
              </span>
            )}
            {isVip && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                <Crown className="w-2.5 h-2.5 text-amber-600" />VIP
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5 gap-5 flex-shrink-0 overflow-x-auto">
          {([
            { id: 'topup' as Tab, label: 'Top-Up', icon: <Sparkles className="w-3 h-3" /> },
            /* { id: 'subscription' as Tab, label: 'Subscribe', icon: <RefreshCw className="w-3 h-3" /> }, */
            /* { id: 'payg' as Tab, label: 'Auto-Pay', icon: <Zap className="w-3 h-3" /> }, */
            { id: 'history' as Tab, label: 'History', icon: <History className="w-3 h-3" /> },
          ]).map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`py-3 text-[11px] font-bold border-b-2 transition-all flex items-center gap-1 whitespace-nowrap ${
                tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >{icon}{label}</button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">

          {/* TAB: Top-Up */}
          {tab === 'topup' && (
            <div className="p-5 space-y-4">
              {isVip && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-600" />Unlimited Access — {userEmail}</p>
                </div>
              )}
              {!razorpayKeyId && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Add <code>RAZORPAY_KEY_ID</code> & <code>RAZORPAY_KEY_SECRET</code> to backend <code>.env</code> to enable payments.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                {packages.map((pkg: WalletPackage) => (
                  <div key={pkg.id} onClick={() => setSelectedPkgId(pkg.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      selectedPkgId === pkg.id ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {pkg.id === 'tier_500' && <span className="absolute -top-2 right-3 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Best Value</span>}
                    <p className="text-xs font-bold text-slate-900">{pkg.credits.toLocaleString()} Credits</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-black text-slate-900 font-mono">₹{pkg.amount_inr}</span>
                      <span className="text-[10px] text-slate-400">({pkg.cost_per_credit}₹/ea)</span>
                    </div>
                  </div>
                ))}
              </div>
              {topupSuccess && <Alert type="success" msg={topupSuccess} />}
              {topupError && <Alert type="error" msg={topupError} />}
              <button onClick={handleTopupCheckout} disabled={topupProcessing || !razorpayKeyId}
                className="btn btn-primary w-full py-3 text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {topupProcessing
                  ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Processing...</span>
                  : <span className="flex items-center justify-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Buy {selectedPkg?.credits.toLocaleString()} Credits — ₹{selectedPkg?.amount_inr}</span>
                }
              </button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HMAC-verified · Instant credit · Idempotent</span>
              </div>
            </div>
          )}

          {/* TAB: Subscription */}
          {tab === 'subscription' && (
            <div className="p-5 space-y-4">
              {activeSubscription ? (
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center"><RefreshCw className="w-3.5 h-3.5" /></div>
                      <div>
                        <p className="text-xs font-bold text-violet-900">Active Subscription</p>
                        <p className="text-[11px] text-violet-600 capitalize">{activeSubscription.plan_id.replace('sub_', '')} Plan</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeSubscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {activeSubscription.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-[11px]"><span className="text-slate-500">Credits/mo</span><p className="font-bold text-slate-900">{activeSubscription.credits_per_cycle.toLocaleString()}</p></div>
                    <div className="text-[11px]"><span className="text-slate-500">Monthly</span><p className="font-bold text-slate-900">₹{activeSubscription.amount_inr}</p></div>
                    {activeSubscription.next_billing && (
                      <div className="text-[11px] col-span-2"><span className="text-slate-500">Next billing</span><p className="font-bold text-slate-900">{new Date(activeSubscription.next_billing).toLocaleDateString()}</p></div>
                    )}
                  </div>
                  {subSuccess && <Alert type="success" msg={subSuccess} />}
                  {subError && <Alert type="error" msg={subError} />}
                  <button onClick={handleCancelSubscription} disabled={cancellingPlan}
                    className="w-full py-2 text-[11px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {cancellingPlan ? 'Cancelling...' : 'Cancel Subscription (keeps credits this period)'}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-700">Choose a Monthly Plan</p>
                  <div className="space-y-2">
                    {subscriptionPlans.map((plan: SubscriptionPlan) => (
                      <div key={plan.id} onClick={() => { if (plan.available) setSelectedPlanId(plan.id) }}
                        className={`p-3.5 rounded-xl border transition-all ${
                          !plan.available ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
                          : selectedPlanId === plan.id ? 'border-violet-600 bg-violet-50/50 ring-2 ring-violet-400/20 cursor-pointer'
                          : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{plan.credits_per_cycle.toLocaleString()} credits/month</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{plan.label}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-slate-900 font-mono">₹{plan.amount_inr}</span>
                            <p className="text-[10px] text-slate-400">/month</p>
                          </div>
                        </div>
                        {!plan.available && <p className="text-[10px] text-amber-600 mt-1.5 font-medium">Plan ID not configured — contact support</p>}
                      </div>
                    ))}
                  </div>
                  {!razorpayKeyId && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>Payment gateway not configured.</span>
                    </div>
                  )}
                  {subSuccess && <Alert type="success" msg={subSuccess} />}
                  {subError && <Alert type="error" msg={subError} />}
                  <button onClick={handleSubscribe} disabled={subProcessing || !razorpayKeyId || !selectedPlan?.available}
                    className="w-full py-3 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {subProcessing
                      ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Setting up...</span>
                      : <span className="flex items-center justify-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Subscribe — {selectedPlan?.credits_per_cycle.toLocaleString()} credits/mo · ₹{selectedPlan?.amount_inr}/mo</span>
                    }
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cancel anytime · Credits auto-added each cycle</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: Pay-As-You-Go */}
          {tab === 'payg' && (
            <div className="p-5 space-y-4">
              {paygMandate?.is_active ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Zap className="w-3.5 h-3.5" /></div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Auto Top-Up Active</p>
                      <p className="text-[11px] text-emerald-600">Card saved for automatic recharging</p>
                    </div>
                    <ToggleRight className="w-6 h-6 text-emerald-600 ml-auto" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-[11px]"><span className="text-slate-500">Triggers below</span><p className="font-bold text-slate-900">{paygMandate.threshold} credits</p></div>
                    <div className="text-[11px]"><span className="text-slate-500">Auto-buys</span><p className="font-bold text-slate-900">{packages.find(p => p.id === paygMandate.package_id)?.credits.toLocaleString() || '—'} credits</p></div>
                    {paygMandate.last_charged_at && (
                      <div className="text-[11px] col-span-2"><span className="text-slate-500">Last charged</span><p className="font-bold text-slate-900">{new Date(paygMandate.last_charged_at).toLocaleString()}</p></div>
                    )}
                  </div>
                  {paygSuccess && <Alert type="success" msg={paygSuccess} />}
                  {paygError && <Alert type="error" msg={paygError} />}
                  <button onClick={handleDisablePayg} disabled={disablingPayg}
                    className="w-full py-2 text-[11px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {disablingPayg ? 'Disabling...' : 'Disable Auto Top-Up'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-1"><Zap className="w-3.5 h-3.5 text-emerald-600" />How Pay-As-You-Go Works</p>
                    <ol className="text-[11px] text-emerald-800 space-y-0.5 list-decimal list-inside">
                      <li>Save your card/UPI once via secure Razorpay checkout</li>
                      <li>We auto-recharge when credits drop below your threshold</li>
                      <li>Cancel or update anytime from this panel</li>
                    </ol>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-600 mb-1.5">Auto-recharge pack</p>
                    <div className="grid grid-cols-2 gap-2">
                      {packages.map((pkg: WalletPackage) => (
                        <button key={pkg.id} onClick={() => setPaygPkgId(pkg.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all text-xs ${paygPkgId === pkg.id ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400/20' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <span className="font-bold">{pkg.credits.toLocaleString()} cr</span>
                          <span className="text-slate-400 ml-1">₹{pkg.amount_inr}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-bold text-slate-600">Trigger when below</p>
                      <span className="text-xs font-black text-emerald-600">{paygThreshold} credits</span>
                    </div>
                    <input type="range" min={1} max={50} value={paygThreshold} onChange={e => setPaygThreshold(Number(e.target.value))} className="w-full accent-emerald-600" />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>1</span><span>50</span></div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Mobile Number</label>
                    <input type="tel" value={paygContact} onChange={e => setPaygContact(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  {!razorpayKeyId && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>Payment gateway not configured.</span>
                    </div>
                  )}
                  {paygSuccess && <Alert type="success" msg={paygSuccess} />}
                  {paygError && <Alert type="error" msg={paygError} />}
                  <button onClick={handlePaygSetup} disabled={paygProcessing || !razorpayKeyId}
                    className="w-full py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paygProcessing
                      ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Setting up mandate...</span>
                      : <span className="flex items-center justify-center gap-1.5"><Zap className="w-3.5 h-3.5" />Save Card & Enable Auto Top-Up (first: ₹{paygPkg?.amount_inr})</span>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: History */}
          {tab === 'history' && (
            <div className="p-5">
              {loadingTx ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No transactions yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{tx.description || tx.transaction_type}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(tx.created_at).toLocaleDateString()} · {tx.reference_id ? `${tx.reference_id.slice(0, 14)}...` : 'SYS'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <div className="text-right font-mono font-bold">
                          <span className={tx.amount_credits > 0 ? 'text-emerald-600' : 'text-slate-700'}>
                            {tx.amount_credits > 0 ? `+${tx.amount_credits}` : tx.amount_credits} cr
                          </span>
                          {tx.amount_inr > 0 && <p className="text-[10px] text-slate-400 font-normal">₹{tx.amount_inr}</p>}
                        </div>
                        {tx.transaction_type === 'purchase' && tx.amount_inr > 0 && (
                          <button onClick={() => setSelectedReceiptTx(tx)} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors">Receipt</button>
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

      {/* Receipt modal */}
      {selectedReceiptTx && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">R</div>
                <span className="font-bold text-sm text-slate-900">Payment Receipt</span>
              </div>
              <button onClick={() => setSelectedReceiptTx(null)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600">
              {[
                ['Receipt ID', selectedReceiptTx.reference_id || selectedReceiptTx.id],
                ['Date', new Date(selectedReceiptTx.created_at).toLocaleString()],
                ['Billed Account', userEmail],
                ['Service', 'IT Software & AI Screening (SAC 998313)'],
                ['Payment Status', '✅ Confirmed (Razorpay)'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-slate-400 flex-shrink-0">{label}:</span>
                  <span className="font-medium text-slate-800 text-right truncate">{val}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Credits Purchased:</span>
                <span className="font-mono font-black text-blue-600 text-sm">+{selectedReceiptTx.amount_credits}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Total Paid:</span>
                <span className="font-mono font-black text-slate-900 text-base">₹{selectedReceiptTx.amount_inr}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors">Print / Save PDF</button>
              <button onClick={() => setSelectedReceiptTx(null)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

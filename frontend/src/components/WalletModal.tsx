import React, { useState, useEffect } from 'react'
import {
  X, CreditCard, ShieldCheck, CheckCircle2, History, ArrowDownRight,
  ArrowUpRight, Sparkles, Crown, Zap, AlertCircle
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
  interface Window {
    Razorpay: any
  }
}

export default function WalletModal() {
  const { credits, packages, isMockMode, isWalletModalOpen, closeWalletModal, refreshBalance, isUnlimited, userEmail } = useWallet()
  const [selectedPkgId, setSelectedPkgId] = useState<string>('tier_100')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState<boolean>(false)

  const isVipUser = isUnlimited || userEmail === 'sanyam.karnavat5@gmail.com'

  useEffect(() => {
    if (activeTab === 'history' && isWalletModalOpen) {
      loadTransactions()
    }
  }, [activeTab, isWalletModalOpen])

  const loadTransactions = async () => {
    try {
      setLoadingTx(true)
      const res = await api.get('/wallet/transactions')
      setTransactions(res.data)
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setLoadingTx(false)
    }
  }

  if (!isWalletModalOpen) return null

  const selectedPkg = packages.find(p => p.id === selectedPkgId) || packages[1] || packages[0]

  const handleCheckout = async () => {
    if (!selectedPkg) return
    setIsProcessing(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const orderRes = await api.post('/wallet/create-order', { package_id: selectedPkg.id })
      const orderData = orderRes.data

      if (orderData.is_mock) {
        await new Promise(r => setTimeout(r, 600))
        const verifyRes = await api.post('/wallet/verify-payment', {
          package_id: selectedPkg.id,
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'sandbox_test_signature'
        })

        setSuccessMsg(`Successfully added ${verifyRes.data.credits_added} credits to your wallet!`)
        await refreshBalance()
        setTimeout(() => {
          setIsProcessing(false)
        }, 500)
        return
      }

      const loadScript = () => {
        return new Promise<boolean>((resolve) => {
          if (window.Razorpay) return resolve(true)
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.onload = () => resolve(true)
          script.onerror = () => resolve(false)
          document.body.appendChild(script)
        })
      }

      const scriptLoaded = await loadScript()
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment gateway SDK.')
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ResumeAI Platform',
        description: `Top-up ${selectedPkg.credits} Resume Screening Credits`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await api.post('/wallet/verify-payment', {
              package_id: selectedPkg.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
            setSuccessMsg(`Payment verified! ${verifyRes.data.credits_added} credits added.`)
            await refreshBalance()
          } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || 'Payment verification failed.')
          } finally {
            setIsProcessing(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
          }
        },
        theme: {
          color: '#2563eb'
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err: any) {
      console.error('Checkout error:', err)
      setErrorMsg(err.response?.data?.detail || err.message || 'Payment initiation failed.')
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-scale-up space-y-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Wallet & Screening Credits</h3>
              <p className="text-xs text-slate-500">1 Credit = 1 Candidate Resume AI Screened</p>
            </div>
          </div>
          <button
            onClick={closeWalletModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Highlight Banner */}
        <div className="p-5 bg-gradient-to-r from-brand-50 via-slate-50 to-indigo-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Available Screening Balance
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              {isVipUser ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900">Unlimited</span>
                  <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white text-[11px] font-mono font-bold">
                    ∞ VIP PRO
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-2xl font-black text-slate-900 font-mono">{credits}</span>
                  <span className="text-xs font-bold text-brand-600">Credits</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            {isVipUser ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                <Crown className="w-3.5 h-3.5 text-amber-600" /> Free Master Tier
              </span>
            ) : (
              <span className="badge badge-blue text-xs">
                ₹5.00 / Resume
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-5 gap-4">
          <button
            onClick={() => setActiveTab('packages')}
            className={`py-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'packages'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Credit Packages
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Billing History
          </button>
        </div>

        {/* Tab 1: Packages */}
        {activeTab === 'packages' && (
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {isVipUser && (
              <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Unlimited Usage Enabled for {userEmail}
                </p>
                <p className="text-brand-700 text-[11px] leading-relaxed">
                  Your account is granted full, unlimited AI resume screening access. You do not need to purchase credits, but you may test mock packages anytime.
                </p>
              </div>
            )}

            {/* Package Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg: WalletPackage) => {
                const isSelected = selectedPkgId === pkg.id
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {pkg.id === 'tier_100' && (
                      <span className="absolute -top-2 right-3 bg-brand-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Popular
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-900">{pkg.credits} Credits</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-black text-slate-900 font-mono">₹{pkg.amount_inr}</span>
                      <span className="text-[10px] text-slate-400">({pkg.cost_per_credit}₹/res)</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="btn btn-primary w-full py-3 text-xs font-bold shadow-md shadow-brand-500/20"
            >
              {isProcessing ? (
                <span>Processing Order...</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Top Up {selectedPkg.credits} Credits for ₹{selectedPkg.amount_inr}
                </span>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant auto-credit upon payment • Guaranteed refund on system faults</span>
            </div>
          </div>
        )}

        {/* Tab 2: Billing Audit Log */}
        {activeTab === 'history' && (
          <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
            {loadingTx ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">No transactions recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">{tx.description || tx.transaction_type}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(tx.created_at).toLocaleDateString()} &middot; ID: {tx.reference_id?.slice(0, 10)}...
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <span className={tx.amount_credits > 0 ? 'text-emerald-600' : 'text-slate-700'}>
                        {tx.amount_credits > 0 ? `+${tx.amount_credits}` : tx.amount_credits} Credits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

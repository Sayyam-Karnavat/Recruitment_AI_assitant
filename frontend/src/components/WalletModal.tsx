import React, { useState, useEffect } from 'react'
import { X, CreditCard, ShieldCheck, CheckCircle2, History, ArrowDownRight, ArrowUpRight, RotateCcw, Sparkles } from 'lucide-react'
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
  const { credits, packages, isMockMode, isWalletModalOpen, closeWalletModal, refreshBalance } = useWallet()
  const [selectedPkgId, setSelectedPkgId] = useState<string>('tier_100')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState<boolean>(false)

  // Load transactions when switching to history tab
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
      // 1. Create order on backend
      const orderRes = await api.post('/wallet/create-order', { package_id: selectedPkg.id })
      const orderData = orderRes.data

      if (orderData.is_mock) {
        // Mock / Sandbox checkout
        await new Promise(r => setTimeout(r, 600)) // brief UX pause
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

      // Real Razorpay Checkout flow
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
          color: '#3b82f6'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="glass w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--c-surface)',
          borderRadius: 16,
          border: '1px solid var(--c-border)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--c-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--c-t1)' }}>
                Wallet & Credits
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--c-t3)' }}>
                1 Credit = 1 Resume Screened & Evaluated
              </p>
            </div>
          </div>
          <button onClick={closeWalletModal} className="btn-icon" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Balance Card Banner */}
        <div
          style={{
            margin: '16px 20px 8px',
            padding: '16px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12))',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Available Balance
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--c-t1)' }}>
                {credits}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6' }}>
                Credits
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-blue" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              ₹5.00 / Resume
            </span>
            {isMockMode && (
              <div style={{ fontSize: '0.7rem', color: 'var(--c-t3)', marginTop: 4 }}>
                (Sandbox Mode Active)
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)', padding: '0 20px', gap: 16 }}>
          <button
            onClick={() => setActiveTab('packages')}
            style={{
              padding: '10px 4px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'packages' ? '#3b82f6' : 'var(--c-t3)',
              borderBottom: activeTab === 'packages' ? '2px solid #3b82f6' : '2px solid transparent',
            }}
          >
            Buy Credits
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 4px',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'history' ? '#3b82f6' : 'var(--c-t3)',
              borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <History size={14} /> Audit Log
          </button>
        </div>

        {/* Tab 1: Packages */}
        {activeTab === 'packages' && (
          <div style={{ padding: '16px 20px', maxHeight: '55vh', overflowY: 'auto' }}>
            {/* Guarantee Callout */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: 16,
              }}
            >
              <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--c-t2)', lineHeight: 1.4 }}>
                <strong>Guarded Credit Protection:</strong> Credits are only consumed for successful evaluations or unreadable documents. System faults (timeouts, server errors) are <em>always automatically refunded</em>.
              </p>
            </div>

            {/* Package selector grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
              {packages.map((pkg: WalletPackage) => {
                const isSelected = selectedPkgId === pkg.id
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkgId(pkg.id)}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--c-border)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--c-surface-raised)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {pkg.id === 'tier_100' && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: 8,
                          background: '#3b82f6',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        POPULAR
                      </span>
                    )}
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-t1)' }}>
                      {pkg.credits} Credits
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-t1)' }}>
                        ₹{pkg.amount_inr}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--c-t3)' }}>
                        (₹{pkg.cost_per_credit}/res)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Messages */}
            {successMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  fontSize: '0.825rem',
                  marginBottom: 14,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  fontSize: '0.825rem',
                  marginBottom: 14,
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isProcessing ? (
                <span>Processing Payment...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Top Up {selectedPkg?.credits} Credits for ₹{selectedPkg?.amount_inr}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Transaction History */}
        {activeTab === 'history' && (
          <div style={{ padding: '16px 20px', maxHeight: '55vh', overflowY: 'auto' }}>
            {loadingTx ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--c-t3)', fontSize: '0.875rem' }}>
                Loading transaction history...
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--c-t3)', fontSize: '0.875rem' }}>
                No wallet transactions recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {transactions.map(tx => {
                  const isPositive = tx.amount_credits > 0
                  const isRefund = tx.transaction_type === 'refund'
                  return (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'var(--c-surface-raised)',
                        border: '1px solid var(--c-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isRefund
                              ? 'rgba(234, 179, 8, 0.15)'
                              : isPositive
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: isRefund
                              ? '#eab308'
                              : isPositive
                              ? '#10b981'
                              : '#ef4444',
                          }}
                        >
                          {isRefund ? (
                            <RotateCcw size={14} />
                          ) : isPositive ? (
                            <ArrowDownRight size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--c-t1)' }}>
                            {tx.description}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--c-t3)' }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: isPositive ? '#10b981' : 'var(--c-t1)',
                          }}
                        >
                          {isPositive ? `+${tx.amount_credits}` : tx.amount_credits} Credits
                        </span>
                        {tx.amount_inr > 0 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--c-t3)' }}>
                            ₹{tx.amount_inr}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

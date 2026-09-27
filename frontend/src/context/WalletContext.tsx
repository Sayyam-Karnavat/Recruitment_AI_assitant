import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'

export interface WalletPackage {
  id: string
  credits: number
  amount_inr: number
  label: string
  cost_per_credit: number
}

export interface SubscriptionPlan {
  id: string
  credits_per_cycle: number
  amount_inr: number
  label: string
  available: boolean
}

export interface ActiveSubscription {
  plan_id: string
  status: string
  credits_per_cycle: number
  amount_inr: number
  next_billing: string | null
}

export interface PaygMandate {
  package_id: string
  threshold: number
  is_active: boolean
  last_charged_at: string | null
}

interface WalletContextType {
  credits: number
  isUnlimited: boolean
  userEmail: string
  role: string
  isAdmin: boolean
  loading: boolean
  packages: WalletPackage[]
  subscriptionPlans: SubscriptionPlan[]
  activeSubscription: ActiveSubscription | null
  paygMandate: PaygMandate | null
  razorpayKeyId: string | null
  isMockMode: boolean
  isWalletModalOpen: boolean
  openWalletModal: () => void
  closeWalletModal: () => void
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const [credits, setCredits] = useState<number>(0)
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [role, setRole] = useState<string>('recruiter')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [packages, setPackages] = useState<WalletPackage[]>([])
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([])
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null)
  const [paygMandate, setPaygMandate] = useState<PaygMandate | null>(null)
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null)
  const [isMockMode, setIsMockMode] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false)

  const refreshBalance = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await api.get('/wallet/balance')
      const email = res.data.email || ''
      const unlimited = Boolean(res.data.is_unlimited || email.toLowerCase() === 'sanyam.karnavat5@gmail.com')
      const admin = Boolean(res.data.is_admin || res.data.role === 'admin' || email.toLowerCase() === 'sanyam.karnavat5@gmail.com')
      setUserEmail(email)
      setIsUnlimited(unlimited)
      setRole(res.data.role || 'recruiter')
      setIsAdmin(admin)
      setCredits(unlimited ? 999999 : (res.data.credits ?? 0))
      if (res.data.packages) setPackages(res.data.packages)
      if (res.data.subscription_plans) setSubscriptionPlans(res.data.subscription_plans)
      setActiveSubscription(res.data.active_subscription || null)
      setPaygMandate(res.data.payg_mandate || null)
      setRazorpayKeyId(res.data.razorpay_key_id || null)
      if (res.data.is_mock_mode !== undefined) setIsMockMode(res.data.is_mock_mode)
    } catch (err) {
      console.error('Failed to load wallet balance:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      refreshBalance()
    } else {
      setCredits(0)
      setIsUnlimited(false)
      setUserEmail('')
      setActiveSubscription(null)
      setPaygMandate(null)
    }
  }, [token, refreshBalance])

  return (
    <WalletContext.Provider
      value={{
        credits,
        isUnlimited,
        userEmail,
        role,
        isAdmin,
        loading,
        packages,
        subscriptionPlans,
        activeSubscription,
        paygMandate,
        razorpayKeyId,
        isMockMode,
        isWalletModalOpen,
        openWalletModal: () => setIsWalletModalOpen(true),
        closeWalletModal: () => setIsWalletModalOpen(false),
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}


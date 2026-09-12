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

interface WalletContextType {
  credits: number
  loading: boolean
  packages: WalletPackage[]
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
  const [packages, setPackages] = useState<WalletPackage[]>([])
  const [isMockMode, setIsMockMode] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false)

  const refreshBalance = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await api.get('/wallet/balance')
      setCredits(res.data.credits ?? 0)
      if (res.data.packages) setPackages(res.data.packages)
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
    }
  }, [token, refreshBalance])

  return (
    <WalletContext.Provider
      value={{
        credits,
        loading,
        packages,
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

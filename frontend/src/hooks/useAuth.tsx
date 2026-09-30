import { createContext, useContext, useState, ReactNode } from 'react'
import api from '../services/api'

interface AuthContextType {
  token: string | null
  loginWithGoogle: (credential: string) => Promise<void>
  loginWithGithub: (code: string) => Promise<void>
  setSessionToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  const loginWithGoogle = async (credential: string) => {
    const res = await api.post('/auth/google', { token: credential })
    const t = res.data.access_token
    localStorage.setItem('token', t)
    setToken(t)
  }

  const loginWithGithub = async (code: string) => {
    const res = await api.post('/auth/github', { code })
    const t = res.data.access_token
    localStorage.setItem('token', t)
    setToken(t)
  }

  const setSessionToken = (newToken: string) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, loginWithGoogle, loginWithGithub, setSessionToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

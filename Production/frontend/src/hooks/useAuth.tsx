import { createContext, useContext, useState, ReactNode } from 'react'
import api from '../services/api'

interface AuthContextType {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const t = res.data.access_token
    localStorage.setItem('token', t)
    setToken(t)
  }

  const register = async (email: string, password: string) => {
    const res = await api.post('/auth/register', { email, password })
    const t = res.data.access_token
    localStorage.setItem('token', t)
    setToken(t)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

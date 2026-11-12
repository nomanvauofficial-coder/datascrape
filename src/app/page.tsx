'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Landing } from '@/components/scrapeflow/landing'
import { AuthModal } from '@/components/scrapeflow/auth-modal'
import { Dashboard } from '@/components/scrapeflow/dashboard'
import {
  api,
  TOKEN_KEY,
  type ClientUser,
  type ClientAccess,
  type MeResponse,
} from '@/lib/types'

export default function Home() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<ClientUser | null>(null)
  const [access, setAccess] = useState<ClientAccess | null>(null)
  const [todayCount, setTodayCount] = useState(0)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')

  const refreshMe = useCallback(async () => {
    try {
      const res = await api<MeResponse>('/api/auth/me')
      setUser(res.user)
      setAccess(res.access)
      setTodayCount(res.todayCount)
    } catch {
      // token invalid/expired — clear it
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      setAccess(null)
    }
  }, [])

  useEffect(() => {
    const boot = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) await refreshMe()
      setBooting(false)
    }
    boot()
  }, [refreshMe])

  const handleAuthed = useCallback(
    async (token: string, authedUser: ClientUser) => {
      localStorage.setItem(TOKEN_KEY, token)
      setUser(authedUser)
      setAuthOpen(false)
      await refreshMe()
    },
    [refreshMe]
  )

  const handleLogout = useCallback(async () => {
    try {
      await api('/api/auth/me', { method: 'DELETE' })
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setAccess(null)
    setTodayCount(0)
  }, [])

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading ScrapeFlow…</p>
        </div>
      </div>
    )
  }

  if (user && access) {
    return (
      <Dashboard
        user={user}
        access={access}
        todayCount={todayCount}
        onRefreshMe={refreshMe}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <>
      <Landing onGetStarted={() => openAuth('signup')} onSignIn={() => openAuth('login')} />
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthed={handleAuthed}
        initialMode={authMode}
      />
    </>
  )
}

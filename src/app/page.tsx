'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Landing } from '@/components/scrapeflow/landing'
import { AuthModal } from '@/components/scrapeflow/auth-modal'
import { Dashboard } from '@/components/scrapeflow/dashboard'
import { getSupabase } from '@/lib/supabase-browser'
import {
  api,
  ApiError,
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

  const clearLocal = useCallback(() => {
    setUser(null)
    setAccess(null)
    setTodayCount(0)
  }, [])

  const refreshMe = useCallback(async () => {
    try {
      const res = await api<MeResponse>('/api/auth/me')
      setUser(res.user)
      setAccess(res.access)
      setTodayCount(res.todayCount)
    } catch (err) {
      // Only a 401 means the session is really invalid; other errors (network…) keep you logged in.
      if (err instanceof ApiError && err.status === 401) {
        await getSupabase().auth.signOut()
        clearLocal()
      }
    }
  }, [clearLocal])

  useEffect(() => {
    const supabase = getSupabase()
    let active = true
    const boot = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) await refreshMe()
      if (active) setBooting(false)
    }
    boot()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearLocal()
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [refreshMe, clearLocal])

  const handleAuthed = useCallback(async () => {
    setAuthOpen(false)
    await refreshMe()
  }, [refreshMe])

  const handleLogout = useCallback(async () => {
    await getSupabase().auth.signOut()
    clearLocal()
  }, [clearLocal])

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

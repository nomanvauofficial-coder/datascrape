'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, Clock, ShieldCheck } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-browser'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthed: () => void | Promise<void>
  initialMode: 'login' | 'signup'
}

export function AuthModal({ open, onOpenChange, onAuthed, initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleModeChange = (m: string) => {
    setMode(m as 'login' | 'signup')
    setError('')
    setInfo('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const supabase = getSupabase()
      const cleanEmail = email.trim().toLowerCase()
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim() } },
        })
        if (err) throw err
        // Supabase hides "already registered" by returning a user with no identities.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Try logging in.')
        }
        if (!data.session) {
          // Email confirmation is switched on in Supabase → ask the user to confirm first.
          setInfo('Account created! Check your email and click the confirmation link, then log in.')
          setPassword('')
          setMode('login')
          return
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (err) throw err
      }
      await onAuthed()
      setName('')
      setEmail('')
      setPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(
        /invalid login credentials/i.test(msg)
          ? 'Invalid email or password.'
          : /email not confirmed/i.test(msg)
            ? 'Please confirm your email first — check your inbox for the link.'
            : msg
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-foreground" />
            </div>
            <DialogTitle className="text-lg">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {mode === 'signup'
              ? 'Your 1-day free trial starts instantly — no credit card needed.'
              : 'Sign in to continue scraping and access your history.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="login">Log in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <form onSubmit={submit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="auth-name">Name (optional)</Label>
                <Input
                  id="auth-name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {info && (
                <p className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                  {info}
                </p>
              )}
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
                  </>
                ) : (
                  'Create account & start trial'
                )}
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" /> 24h full access
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-primary" /> No card required
                </span>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="login">
            <form onSubmit={submit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {info && (
                <p className="text-sm text-primary bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                  {info}
                </p>
              )}
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Log in'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

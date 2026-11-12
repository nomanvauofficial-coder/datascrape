'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import {
  Loader2,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Info,
  Lock,
} from 'lucide-react'
import { api, PLAN_META, type PlanIdClient, type SubscribeResponse } from '@/lib/types'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanIdClient | null
  onSuccess: (user: SubscribeResponse['user']) => void
}

function formatCardNumber(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + '/' + digits.slice(2)
}

export function CheckoutDialog({ open, onOpenChange, plan, onSuccess }: CheckoutDialogProps) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txId, setTxId] = useState('')

  const planMeta = PLAN_META.find((p) => p.id === plan)
  const cardDigits = number.replace(/\D/g, '')

  const reset = () => {
    setName('')
    setNumber('')
    setExpiry('')
    setCvc('')
    setError('')
    setTxId('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plan) return
    setError('')
    setLoading(true)
    try {
      const res = await api<SubscribeResponse>('/api/billing/subscribe', {
        method: 'POST',
        body: { plan, card: { name, number, expiry, cvc } },
      })
      setTxId(res.transactionId)
      toast({
        title: `${planMeta?.name} plan activated!`,
        description: `Demo payment of $${res.amount.toFixed(2)} processed successfully.`,
      })
      onSuccess(res.user)
      setTimeout(() => {
        onOpenChange(false)
        setTimeout(reset, 300)
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 300) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Checkout — {planMeta?.name} plan
          </DialogTitle>
          <DialogDescription>
            {planMeta?.durationDays === null
              ? 'One-time payment. This plan never expires.'
              : `Billed once for ${planMeta?.durationDays} days of access.`}
          </DialogDescription>
        </DialogHeader>

        {txId ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
            <h3 className="text-xl font-bold">Payment successful</h3>
            <p className="text-sm text-muted-foreground">
              Your <span className="text-foreground font-semibold">{planMeta?.name}</span> plan is now active.
            </p>
            <p className="text-xs text-muted-foreground font-mono">Txn: {txId}</p>
          </div>
        ) : (
          <>
            {/* demo notice */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200/90">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <span className="font-semibold">Demo checkout</span> — no real money is
                charged. Use any test card, e.g. 4242 4242 4242 4242.
              </span>
            </div>

            {/* order summary */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {planMeta?.name}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validity</span>
                <span>
                  {planMeta?.durationDays === null
                    ? 'Lifetime — never expires'
                    : `${planMeta?.durationDays} days`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily scrapes</span>
                <span>{planMeta?.dailyLimit === null ? 'Unlimited' : planMeta?.dailyLimit}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items per scrape</span>
                <span>{planMeta?.itemsPerScrape}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span>Total due today</span>
                <span className="text-primary text-lg">${planMeta?.price.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-name">Cardholder name</Label>
                <Input
                  id="card-name"
                  required
                  placeholder="Name on card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="cc-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-number">Card number</Label>
                <div className="relative">
                  <Input
                    id="card-number"
                    required
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={number}
                    onChange={(e) => setNumber(formatCardNumber(e.target.value))}
                    autoComplete="cc-number"
                    className="pr-10"
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">Expiry</Label>
                  <Input
                    id="card-expiry"
                    required
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    autoComplete="cc-exp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-cvc">CVC</Label>
                  <Input
                    id="card-cvc"
                    required
                    inputMode="numeric"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={loading || cardDigits.length < 13}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing payment…
                  </>
                ) : (
                  `Pay $${planMeta?.price.toFixed(2)}`
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
                Simulated 256-bit encrypted checkout. Swap in Stripe or PayPal for production.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

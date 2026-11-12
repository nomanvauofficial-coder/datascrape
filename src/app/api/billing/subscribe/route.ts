import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, publicUser } from '@/lib/auth'
import { PLANS, computeAccess } from '@/lib/plans'

export const runtime = 'nodejs'

/**
 * POST => subscribe to a plan.
 * DEMO PAYMENT GATEWAY: validates the card format and simulates a successful
 * charge. Wire Stripe/PayPal here for production (see README notes in UI).
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  let body: {
    plan?: string
    card?: { name?: string; number?: string; expiry?: string; cvc?: string }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const plan = PLANS.find((p) => p.id === body.plan)
  if (!plan) {
    return NextResponse.json({ error: 'Unknown plan selected.' }, { status: 400 })
  }

  // --- mock card validation (format only, no real charge) ---
  const card = body.card ?? {}
  const number = String(card.number ?? '').replace(/[\s-]/g, '')
  const name = String(card.name ?? '').trim()
  const expiry = String(card.expiry ?? '').trim()
  const cvc = String(card.cvc ?? '').trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Please enter the cardholder name.' }, { status: 400 })
  }
  if (!/^\d{13,19}$/.test(number)) {
    return NextResponse.json({ error: 'Card number must be 13–19 digits.' }, { status: 400 })
  }
  const expiryMatch = expiry.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/)
  if (!expiryMatch) {
    return NextResponse.json({ error: 'Expiry must be in MM/YY format.' }, { status: 400 })
  }
  const expMonth = parseInt(expiryMatch[1], 10)
  const expYear = 2000 + parseInt(expiryMatch[2], 10)
  const now = new Date()
  const expEnd = new Date(expYear, expMonth, 1)
  if (expEnd.getTime() < now.getTime()) {
    return NextResponse.json({ error: 'This card has expired.' }, { status: 400 })
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    return NextResponse.json({ error: 'CVC must be 3 or 4 digits.' }, { status: 400 })
  }

  // --- simulated gateway latency ---
  await new Promise((r) => setTimeout(r, 1200))

  // --- apply the plan ---
  const planExpiresAt =
    plan.durationDays === null
      ? null
      : new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      plan: plan.id,
      planExpiresAt,
    },
  })

  const access = computeAccess(updated)
  return NextResponse.json({
    ok: true,
    transactionId: 'demo_' + Math.random().toString(36).slice(2, 12),
    amount: plan.price,
    currency: plan.currency,
    plan: plan.id,
    user: publicUser(updated),
    access,
  })
}

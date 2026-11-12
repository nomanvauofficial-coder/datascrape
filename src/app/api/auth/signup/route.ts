import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createSession, publicUser } from '@/lib/auth'
import { TRIAL_DURATION_DAYS } from '@/lib/plans'

export const runtime = 'nodejs'

/** POST => Sign up (creates account + starts the 1-day free trial) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const name = String(body.name ?? '').trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try logging in.' },
        { status: 409 }
      )
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000)
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash: hashPassword(password),
        plan: 'trial',
        trialEndsAt,
        planExpiresAt: trialEndsAt,
      },
    })

    const { token } = await createSession(user.id)
    return NextResponse.json({ token, user: publicUser(user) }, { status: 201 })
  } catch (err) {
    console.error('signup error', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

/** PUT => Log in */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const { token } = await createSession(user.id)
    return NextResponse.json({ token, user: publicUser(user) })
  } catch (err) {
    console.error('login error', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

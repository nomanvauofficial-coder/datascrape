import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import type { User } from '@prisma/client'

const SESSION_DAYS = 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const original = Buffer.from(hash, 'hex')
  if (candidate.length !== original.length) return false
  return timingSafeEqual(candidate, original)
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  return null
}

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = getTokenFromRequest(req)
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    trialEndsAt: user.trialEndsAt,
    createdAt: user.createdAt,
  }
}

export type PublicUser = ReturnType<typeof publicUser>

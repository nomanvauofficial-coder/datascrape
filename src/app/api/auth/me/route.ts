import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, publicUser } from '@/lib/auth'
import { computeAccess } from '@/lib/plans'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const access = computeAccess(user)

  // count scrapes made today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todayCount = await db.scrape.count({
    where: { userId: user.id, createdAt: { gte: startOfDay } },
  })

  return NextResponse.json({ user: publicUser(user), access, todayCount })
}

/** DELETE => log out (removes the session token) */
export async function DELETE(req: NextRequest) {
  const { getTokenFromRequest } = await import('@/lib/auth')
  const token = getTokenFromRequest(req)
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  return NextResponse.json({ ok: true })
}

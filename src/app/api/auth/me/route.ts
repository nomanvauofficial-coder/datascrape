import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, publicUser } from '@/lib/auth'
import { computeAccess } from '@/lib/plans'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const access = computeAccess(user)

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const { count } = await user.db
    .from('scrapes')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString())

  return NextResponse.json({ user: publicUser(user), access, todayCount: count ?? 0 })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10))

  const [scrapes, total] = await Promise.all([
    db.scrape.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        url: true,
        title: true,
        mode: true,
        itemCount: true,
        createdAt: true,
      },
    }),
    db.scrape.count({ where: { userId: user.id } }),
  ])

  return NextResponse.json({ scrapes, total })
}

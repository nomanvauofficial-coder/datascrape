import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0)

  const { data, count, error } = await user.db
    .from('scrapes')
    .select('id,url,title,mode,item_count,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Could not load history.' }, { status: 500 })

  const scrapes = (data ?? []).map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    mode: s.mode,
    itemCount: s.item_count,
    createdAt: s.created_at,
  }))
  return NextResponse.json({ scrapes, total: count ?? scrapes.length })
}

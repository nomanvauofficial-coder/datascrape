import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

/** GET => full scrape record (with extracted data) — used by "view" in history */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await ctx.params
  const { data: scrape } = await user.db
    .from('scrapes')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!scrape) return NextResponse.json({ error: 'Scrape not found.' }, { status: 404 })

  return NextResponse.json({
    id: scrape.id,
    url: scrape.url,
    pageTitle: scrape.title,
    mode: scrape.mode,
    items: scrape.data,
    itemCount: scrape.item_count,
    createdAt: scrape.created_at,
  })
}

/** DELETE => remove a scrape from history */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await ctx.params
  const { data } = await user.db.from('scrapes').delete().eq('id', id).select('id')
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Scrape not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

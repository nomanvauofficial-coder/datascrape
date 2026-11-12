import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
  const scrape = await db.scrape.findFirst({ where: { id, userId: user.id } })
  if (!scrape) return NextResponse.json({ error: 'Scrape not found.' }, { status: 404 })

  return NextResponse.json({
    id: scrape.id,
    url: scrape.url,
    pageTitle: scrape.title,
    mode: scrape.mode,
    items: JSON.parse(scrape.data),
    itemCount: scrape.itemCount,
    createdAt: scrape.createdAt,
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
  const deleted = await db.scrape.deleteMany({ where: { id, userId: user.id } })
  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Scrape not found.' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, publicUser } from '@/lib/auth'
import { computeAccess } from '@/lib/plans'
import { scrapeUrl, type ScrapeMode } from '@/lib/scraper'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_MODES: ScrapeMode[] = ['auto', 'products', 'links', 'images', 'tables', 'text']

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const access = computeAccess(user)
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: access.reason, code: 'SUBSCRIPTION_REQUIRED' },
      { status: 402 }
    )
  }

  // daily quota check
  if (access.dailyLimit !== null) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayCount = await db.scrape.count({
      where: { userId: user.id, createdAt: { gte: startOfDay } },
    })
    if (todayCount >= access.dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${access.dailyLimit} scrapes/day on your plan). The counter resets at midnight.`,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429 }
      )
    }
  }

  let body: { url?: string; mode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const mode = (VALID_MODES.includes(body.mode as ScrapeMode) ? body.mode : 'auto') as ScrapeMode

  try {
    const result = await scrapeUrl(String(body.url ?? ''), mode)

    // apply plan-based per-scrape item limit
    const planLimit = access.itemsPerScrape
    const foundCount = result.items.length
    const items = result.items.slice(0, planLimit)
    const truncatedByPlan = foundCount > planLimit

    const saved = await db.scrape.create({
      data: {
        userId: user.id,
        url: result.finalUrl,
        title: result.pageTitle || result.finalUrl,
        mode: result.mode,
        itemCount: items.length,
        data: JSON.stringify(items),
      },
    })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayTotal = await db.scrape.count({
      where: { userId: user.id, createdAt: { gte: startOfDay } },
    })
    const remaining =
      access.dailyLimit === null ? null : Math.max(0, access.dailyLimit - todayTotal)

    return NextResponse.json({
      id: saved.id,
      url: result.finalUrl,
      pageTitle: result.pageTitle,
      pageDescription: result.pageDescription,
      mode: result.mode,
      items,
      itemCount: items.length,
      foundCount,
      planLimit,
      truncatedByPlan,
      responseTimeMs: result.responseTimeMs,
      truncated: result.truncated,
      remainingToday: remaining,
      user: publicUser(user),
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to scrape the URL. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

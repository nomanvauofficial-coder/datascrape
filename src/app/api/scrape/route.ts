import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, publicUser } from '@/lib/auth'
import { computeAccess } from '@/lib/plans'
import { scrapeUrl, type ScrapeMode } from '@/lib/scraper'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_MODES: ScrapeMode[] = [
  'auto', 'products', 'links', 'images', 'tables', 'text',
  'structured', 'contacts', 'custom',
]

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
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count: todayCount } = await user.db
      .from('scrapes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
    if ((todayCount ?? 0) >= access.dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${access.dailyLimit} scrapes/day on your plan). The counter resets at midnight.`,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429 }
      )
    }
  }

  let body: { url?: string; mode?: string; selector?: string; pages?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const mode = (VALID_MODES.includes(body.mode as ScrapeMode) ? body.mode : 'auto') as ScrapeMode

  try {
    const pages = Math.min(5, Math.max(1, Math.floor(Number(body.pages) || 1)))
    const result = await scrapeUrl(String(body.url ?? ''), mode, {
      selector: String(body.selector ?? '').trim().slice(0, 300) || undefined,
      pages,
    })

    // apply plan-based per-scrape item limit
    const planLimit = access.itemsPerScrape
    const foundCount = result.items.length
    const items = result.items.slice(0, planLimit)
    const truncatedByPlan = foundCount > planLimit

    const { data: saved, error: saveError } = await user.db
      .from('scrapes')
      .insert({
        user_id: user.id,
        url: result.finalUrl,
        title: result.pageTitle || result.finalUrl,
        mode: result.mode,
        item_count: items.length,
        data: items,
      })
      .select('id')
      .single()
    if (saveError || !saved) {
      throw new Error('Scrape worked but saving it to your history failed. Please try again.')
    }

    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count: todayTotal } = await user.db
      .from('scrapes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
    const remaining =
      access.dailyLimit === null ? null : Math.max(0, access.dailyLimit - (todayTotal ?? 0))

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
      note: result.note ?? null,
      pagesFetched: result.pagesFetched,
      user: publicUser(user),
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to scrape the URL. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export type PlanId = 'trial' | 'weekly' | 'monthly' | 'lifetime'

export interface PlanDef {
  id: PlanId
  name: string
  price: number
  currency: string
  durationDays: number | null // null => forever
  dailyLimit: number | null // null => unlimited
  itemsPerScrape: number // max items extracted in one scrape
  tagline: string
  features: string[]
  highlight?: boolean
}

export const TRIAL_DURATION_DAYS = 1 // 1-day free trial
export const TRIAL_DAILY_LIMIT = 10
export const TRIAL_ITEMS_PER_SCRAPE = 20

export const PLANS: PlanDef[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 4.99,
    currency: 'USD',
    durationDays: 7,
    dailyLimit: 100,
    itemsPerScrape: 50,
    tagline: 'Perfect for a quick job or a one-off project.',
    features: [
      'Up to 50 items per scrape',
      '100 scrapes per day',
      'All 9 extract modes (auto, products, links, images, tables, text, embedded data, contacts, custom selector)',
      'CSV & JSON export',
      'Full scrape history',
      'Email support',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 14.99,
    currency: 'USD',
    durationDays: 30,
    dailyLimit: 500,
    itemsPerScrape: 100,
    tagline: 'Best for growing teams and recurring data needs.',
    features: [
      'Up to 100 items per scrape',
      '500 scrapes per day',
      'Priority processing queue',
      'Advanced product/price detection',
      'CSV & JSON export',
      'Priority email support',
    ],
    highlight: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 79.0,
    currency: 'USD',
    durationDays: null,
    dailyLimit: null,
    itemsPerScrape: 200,
    tagline: 'Pay once, scrape forever. No renewals, ever.',
    features: [
      'Up to 200 items per scrape',
      'Unlimited scrapes — forever',
      'Never expires, no renewals',
      'All future extract modes included',
      'CSV & JSON export',
      'Dedicated support channel',
    ],
  },
]

export function getPlan(planId: string): PlanDef | null {
  return PLANS.find((p) => p.id === planId) ?? null
}

export interface AccessInfo {
  hasAccess: boolean
  plan: PlanId
  expired: boolean
  expiresAt: Date | null
  dailyLimit: number | null
  itemsPerScrape: number
  reason: string
}

/** Compute whether the user currently has scraping access, based on plan + expiry. */
export function computeAccess(user: {
  plan: string
  planExpiresAt: Date | null
  trialEndsAt: Date
}): AccessInfo {
  const now = Date.now()

  if (user.plan === 'lifetime') {
    return {
      hasAccess: true,
      plan: 'lifetime',
      expired: false,
      expiresAt: null,
      dailyLimit: null,
      itemsPerScrape: 200,
      reason: 'Lifetime plan — unlimited access.',
    }
  }

  const expiresAt =
    user.plan === 'trial' ? user.trialEndsAt : user.planExpiresAt ?? user.trialEndsAt
  const expired = !expiresAt || expiresAt.getTime() < now

  if (user.plan === 'trial') {
    return {
      hasAccess: !expired,
      plan: 'trial',
      expired,
      expiresAt: expiresAt,
      dailyLimit: TRIAL_DAILY_LIMIT,
      itemsPerScrape: TRIAL_ITEMS_PER_SCRAPE,
      reason: expired
        ? 'Your 1-day free trial has ended. Upgrade to continue scraping.'
        : 'Free trial active — 1 day, 20 items per scrape, 10 scrapes/day.',
    }
  }

  const plan = getPlan(user.plan)
  return {
    hasAccess: !expired,
    plan: user.plan as PlanId,
    expired,
    expiresAt: expiresAt,
    dailyLimit: plan?.dailyLimit ?? 100,
    itemsPerScrape: plan?.itemsPerScrape ?? 50,
    reason: expired
      ? `Your ${plan?.name ?? user.plan} plan has expired. Renew to continue scraping.`
      : `${plan?.name ?? user.plan} plan active — up to ${plan?.itemsPerScrape ?? 50} items per scrape.`,
  }
}

export function planLabel(user: {
  plan: string
  planExpiresAt: Date | null
  trialEndsAt: Date
}): string {
  if (user.plan === 'lifetime') return 'Lifetime'
  const expiresAt = user.plan === 'trial' ? user.trialEndsAt : user.planExpiresAt
  if (user.plan === 'trial') return 'Free Trial'
  return getPlan(user.plan)?.name ?? user.plan
}

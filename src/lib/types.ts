/* Shared client-side types + API helper for ScrapeFlow */

export type PlanIdClient = 'trial' | 'weekly' | 'monthly' | 'lifetime'

export interface ClientUser {
  id: string
  email: string
  name: string | null
  plan: PlanIdClient
  planExpiresAt: string | null
  trialEndsAt: string
  createdAt: string
}

export interface ClientAccess {
  hasAccess: boolean
  plan: PlanIdClient
  expired: boolean
  expiresAt: string | null
  dailyLimit: number | null
  itemsPerScrape: number
  reason: string
}

export interface ScrapeItem {
  [key: string]: string
}

export interface ScrapeResponse {
  id: string
  url: string
  pageTitle: string
  pageDescription: string
  mode: string
  items: ScrapeItem[]
  itemCount: number
  foundCount: number
  planLimit: number
  truncatedByPlan: boolean
  responseTimeMs: number
  truncated: boolean
  remainingToday: number | null
}

export interface HistoryItem {
  id: string
  url: string
  title: string
  mode: string
  itemCount: number
  createdAt: string
}

export interface MeResponse {
  user: ClientUser
  access: ClientAccess
  todayCount: number
}

export interface SubscribeResponse {
  ok: boolean
  transactionId: string
  amount: number
  currency: string
  plan: PlanIdClient
  user: ClientUser
}

export interface PlanMeta {
  id: PlanIdClient
  name: string
  price: number
  durationDays: number | null
  dailyLimit: number | null
  itemsPerScrape: number
  tagline: string
  features: string[]
  highlight?: boolean
}

export const PLAN_META: PlanMeta[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 4.99,
    durationDays: 7,
    dailyLimit: 100,
    itemsPerScrape: 50,
    tagline: 'Perfect for a quick job or a one-off project.',
    features: [
      'Up to 50 items per scrape',
      '100 scrapes per day',
      'All 6 extract modes',
      'CSV & JSON export',
      'Full scrape history',
      'Email support',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 14.99,
    durationDays: 30,
    dailyLimit: 500,
    itemsPerScrape: 100,
    tagline: 'Best for growing teams and recurring data needs.',
    highlight: true,
    features: [
      'Up to 100 items per scrape',
      '500 scrapes per day',
      'All 6 extract modes',
      'Priority processing',
      'Advanced product & price detection',
      'CSV & JSON export',
      'Priority support',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: 79.0,
    durationDays: null,
    dailyLimit: null,
    itemsPerScrape: 200,
    tagline: 'Pay once, scrape forever. No renewals, ever.',
    features: [
      'Up to 200 items per scrape',
      'Unlimited scrapes — forever',
      'Never expires, no renewals',
      'All 6 extract modes',
      'All future extract modes included',
      'CSV & JSON export',
      'Dedicated support channel',
    ],
  },
]

export const TOKEN_KEY = 'scrapeflow_token'

export class ApiError extends Error {
  code?: string
  status: number
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token && opts.auth !== false) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      (json as { error?: string }).error ?? 'Request failed. Please try again.',
      res.status,
      (json as { code?: string }).code
    )
  }
  return json as T
}

/* -------------------------- export helpers -------------------------- */

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function toCsv(items: ScrapeItem[], columns: string[]): string {
  const header = columns.map(csvEscape).join(',')
  const rows = items.map((item) =>
    columns.map((c) => csvEscape(item[c] ?? '')).join(',')
  )
  return [header, ...rows].join('\r\n')
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Human-readable countdown like "23h 41m" or "5d 3h" */
export function timeUntil(iso: string | null): string {
  if (!iso) return 'never expires'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const mins = Math.floor(diff / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const minutes = mins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

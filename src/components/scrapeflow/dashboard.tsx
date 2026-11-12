'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { ResultsTable } from '@/components/scrapeflow/results-table'
import { CheckoutDialog } from '@/components/scrapeflow/checkout-dialog'
import {
  Globe,
  ScanSearch,
  Loader2,
  LogOut,
  Crown,
  Clock,
  AlertTriangle,
  History as HistoryIcon,
  Trash2,
  Eye,
  CreditCard,
  Infinity as InfinityIcon,
  Zap,
  Check,
  ArrowUpRight,
  Gauge,
} from 'lucide-react'
import {
  api,
  PLAN_META,
  formatDateTime,
  timeUntil,
  type ClientUser,
  type ClientAccess,
  type ScrapeResponse,
  type ScrapeItem,
  type HistoryItem,
  type PlanIdClient,
} from '@/lib/types'

interface DashboardProps {
  user: ClientUser
  access: ClientAccess
  todayCount: number
  onRefreshMe: () => Promise<void>
  onLogout: () => void
}

const MODES = [
  { value: 'auto', label: 'Auto-detect (recommended)', hint: 'Finds repeated blocks like product cards automatically' },
  { value: 'products', label: 'Products & prices', hint: 'Best for e-commerce category pages' },
  { value: 'links', label: 'All links', hint: 'Every hyperlink with its anchor text' },
  { value: 'images', label: 'All images', hint: 'Image URLs with alt text' },
  { value: 'tables', label: 'HTML tables', hint: 'Table rows with column headers' },
  { value: 'text', label: 'Text & headings', hint: 'Headings, meta description and paragraphs' },
  { value: 'structured', label: 'Embedded data (JSON)', hint: 'Reads JSON-LD and hidden app data (Next.js, Nuxt…) — works on many JavaScript-built sites' },
  { value: 'contacts', label: 'Emails, phones & socials', hint: 'Collects email addresses, phone numbers and social profile links' },
  { value: 'custom', label: 'Custom selector (any element)', hint: 'Type a CSS selector to grab exactly what you want, e.g. .price or a.title@href' },
]

const PAGE_OPTIONS = [1, 2, 3, 5]

function planBadgeClass(plan: string): string {
  switch (plan) {
    case 'trial':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-400'
    case 'weekly':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
    case 'monthly':
      return 'border-violet-500/40 bg-violet-500/10 text-violet-400'
    case 'lifetime':
      return 'border-amber-400/60 bg-amber-400/10 text-amber-300'
    default:
      return 'border-border text-muted-foreground'
  }
}

export function Dashboard({ user, access, todayCount, onRefreshMe, onLogout }: DashboardProps) {
  const [tab, setTab] = useState<'scraper' | 'history' | 'billing'>('scraper')
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState('auto')
  const [selector, setSelector] = useState('')
  const [pages, setPages] = useState('1')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [result, setResult] = useState<ScrapeResponse | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [checkoutPlan, setCheckoutPlan] = useState<PlanIdClient | null>(null)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await api<{ scrapes: HistoryItem[]; total: number }>('/api/scrapes?limit=50')
      setHistory(res.scrapes)
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  const doScrape = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setScrapeError('')
    if (!url.trim()) {
      setScrapeError('Please enter a URL to scrape.')
      return
    }
    setScraping(true)
    setResult(null)
    try {
      const res = await api<ScrapeResponse>('/api/scrape', {
        method: 'POST',
        body: { url, mode, selector: mode === 'custom' ? selector : undefined, pages: Number(pages) },
      })
      setResult(res)
      toast({
        title: `Scraped ${res.itemCount} records`,
        description: `${res.pageTitle || res.url} · ${(res.responseTimeMs / 1000).toFixed(1)}s`,
      })
      await onRefreshMe()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scrape failed.'
      setScrapeError(msg)
      if (err instanceof Error && 'status' in err && (err as { status?: number }).status === 402) {
        setTab('billing')
      }
    } finally {
      setScraping(false)
    }
  }

  const viewHistoryItem = async (id: string) => {
    try {
      const res = await api<Partial<ScrapeResponse> & { id: string; url: string; pageTitle: string; mode: string; items: ScrapeItem[]; itemCount: number }>(
        `/api/scrapes/${id}`
      )
      setResult({
        id: res.id,
        url: res.url,
        pageTitle: res.pageTitle,
        pageDescription: '',
        mode: res.mode,
        items: res.items,
        itemCount: res.itemCount,
        foundCount: res.itemCount,
        planLimit: res.itemCount,
        truncatedByPlan: false,
        responseTimeMs: undefined as unknown as number,
        truncated: false,
        remainingToday: null,
      })
      setUrl(res.url)
      setMode(res.mode)
      setSelector('')
      setTab('scraper')
    } catch (err) {
      toast({
        title: 'Could not load scrape',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    }
  }

  const deleteHistoryItem = async (id: string) => {
    try {
      await api(`/api/scrapes/${id}`, { method: 'DELETE' })
      setHistory((h) => h.filter((x) => x.id !== id))
      if (result?.id === id) setResult(null)
      toast({ title: 'Deleted', description: 'Scrape removed from history.' })
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const subscribeSuccess = async () => {
    await onRefreshMe()
  }

  const expiryLabel = () => {
    if (user.plan === 'lifetime') return 'Never expires'
    const target = user.plan === 'trial' ? user.trialEndsAt : user.planExpiresAt
    if (user.plan === 'trial') return `Trial ends in ${timeUntil(target)}`
    return `Expires ${target ? formatDateTime(target) : ''} (in ${timeUntil(target)})`
  }

  const usagePercent =
    access.dailyLimit === null
      ? null
      : Math.min(100, Math.round((todayCount / access.dailyLimit) * 100))

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ============ Top bar ============ */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block">ScrapeFlow</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Badge variant="outline" className={`capitalize ${planBadgeClass(user.plan)}`}>
              {user.plan === 'lifetime' ? (
                <span className="inline-flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Lifetime
                </span>
              ) : (
                user.plan
              )}
            </Badge>
            {access.dailyLimit !== null && (
              <span className="text-xs text-muted-foreground hidden md:inline-flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                {todayCount}/{access.dailyLimit} scrapes today
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate hidden lg:block max-w-[180px]">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={onLogout} className="gap-1.5 shrink-0">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ============ Expired / status banner ============ */}
        {!access.hasAccess ? (
          <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <AlertTitle className="text-amber-300">Your plan has expired</AlertTitle>
            <AlertDescription className="text-amber-200/80">
              {access.reason} Pick a plan in the Billing tab to resume scraping — your
              history is safe.
            </AlertDescription>
            <Button
              size="sm"
              className="mt-3 col-start-2 font-semibold"
              onClick={() => setTab('billing')}
            >
              View plans
            </Button>
          </Alert>
        ) : (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Clock className="w-4 h-4 text-primary" />
            <AlertTitle>{access.reason}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {expiryLabel()}
              {access.dailyLimit !== null &&
                ` · Used ${todayCount} of ${access.dailyLimit} scrapes today`}
              {user.plan === 'trial' && ' · Upgrade anytime in Billing to keep going.'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="scraper" className="gap-1.5">
              <ScanSearch className="w-4 h-4" />
              <span className="hidden sm:inline">Scraper</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <HistoryIcon className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* ============ SCRAPER TAB ============ */}
          <TabsContent value="scraper" className="space-y-6">
            <form
              onSubmit={doScrape}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex items-center flex-1 gap-2 rounded-xl border border-input bg-background/50 px-3 focus-within:ring-1 focus-within:ring-ring">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste a category link or any page URL — e.g. https://books.toscrape.com/catalogue/category/books/fantasy_19/index.html"
                    className="border-0 bg-transparent px-0 h-11 focus-visible:ring-0 shadow-none text-sm"
                    aria-label="URL to scrape"
                    disabled={!access.hasAccess}
                  />
                </div>
                <div className="flex gap-3 w-full min-w-0">
                  <Select value={mode} onValueChange={setMode} disabled={!access.hasAccess}>
                    <SelectTrigger className="flex-1 min-w-0 lg:w-[220px] lg:flex-none h-11">
                      <SelectValue placeholder="Extract mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    disabled={scraping || !access.hasAccess}
                    className="h-11 px-6 font-semibold gap-2"
                  >
                    {scraping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scraping…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Scrape
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {mode === 'custom' && (
                  <Input
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    placeholder="CSS selector — e.g. .product-card h2   or   a.title@href"
                    className="h-11 flex-1 font-mono text-sm"
                    aria-label="CSS selector"
                    disabled={!access.hasAccess}
                  />
                )}
                <Select value={pages} onValueChange={setPages} disabled={!access.hasAccess}>
                  <SelectTrigger className="h-11 w-full sm:w-[200px]" aria-label="Pages to scrape">
                    <SelectValue placeholder="Pages" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 1 ? '1 page' : `Follow “next” — ${n} pages`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                {MODES.find((m) => m.value === mode)?.hint}
                {' · '}Your <span className="text-foreground font-medium">{access.plan}</span> plan
                extracts up to <span className="text-primary font-medium">{access.itemsPerScrape} items</span> per
                scrape{' · '}server-side.
              </p>
            </form>

            {scrapeError && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Scrape failed</AlertTitle>
                <AlertDescription>{scrapeError}</AlertDescription>
              </Alert>
            )}

            {scraping && (
              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-sm text-muted-foreground">
                  Fetching and parsing the page… multi-page scrapes can take up to 45 seconds.
                </div>
              </div>
            )}

            {result && !scraping && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {result.mode} mode
                  </Badge>
                  <h2 className="font-semibold text-lg truncate max-w-full sm:max-w-lg" title={result.pageTitle || result.url}>
                    {result.pageTitle || result.url}
                  </h2>
                </div>
                {result.note && (
                  <Alert className="border-sky-500/40 bg-sky-500/10">
                    <AlertTriangle className="w-4 h-4 text-sky-400" />
                    <AlertTitle className="text-sky-300">Good to know</AlertTitle>
                    <AlertDescription className="text-sky-200/80">{result.note}</AlertDescription>
                  </Alert>
                )}
                {result.truncatedByPlan && (
                  <Alert className="border-amber-500/40 bg-amber-500/10">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <AlertTitle className="text-amber-300">
                      {result.foundCount} records found — plan limit reached
                    </AlertTitle>
                    <AlertDescription className="text-amber-200/80">
                      <p>
                        Your <span className="capitalize font-medium">{access.plan}</span> plan
                        extracted the first {result.planLimit} items. Upgrade to extract more per
                        scrape.
                      </p>
                    </AlertDescription>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 col-start-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                      onClick={() => setTab('billing')}
                    >
                      Upgrade plan
                    </Button>
                  </Alert>
                )}
                <ResultsTable
                  items={result.items}
                  sourceUrl={result.url}
                  mode={result.mode}
                  responseTimeMs={result.responseTimeMs}
                  truncated={result.truncated}
                  foundCount={result.foundCount}
                  planLimit={result.planLimit}
                />
              </div>
            )}
          </TabsContent>

          {/* ============ HISTORY TAB ============ */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Scrape history</h2>
                <p className="text-sm text-muted-foreground">
                  Your last 50 scrapes — view results again or re-download exports.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>

            {historyLoading ? (
              <div className="rounded-xl border border-border p-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <HistoryIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No scrapes yet. Run your first scrape in the Scraper tab.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="max-h-[520px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow className="hover:bg-transparent bg-card">
                        <TableHead>Page</TableHead>
                        <TableHead className="w-[100px]">Mode</TableHead>
                        <TableHead className="w-[80px] text-right">Rows</TableHead>
                        <TableHead className="w-[150px]">Date</TableHead>
                        <TableHead className="w-[130px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h) => (
                        <TableRow key={h.id} className="hover:bg-muted/40">
                          <TableCell className="max-w-[380px]">
                            <div className="truncate font-medium text-sm" title={h.title}>
                              {h.title}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={h.url}>
                              {h.url}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {h.mode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{h.itemCount}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(h.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewHistoryItem(h.id)}
                                className="gap-1 h-8"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHistoryItem(h.id)}
                                className="h-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============ BILLING TAB ============ */}
          <TabsContent value="billing" className="space-y-6">
            {/* current plan card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-semibold text-lg">Current plan</h2>
                    <Badge variant="outline" className={`capitalize ${planBadgeClass(user.plan)}`}>
                      {user.plan === 'lifetime' && <Crown className="w-3 h-3 mr-1" />}
                      {user.plan}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                    {user.plan === 'lifetime' ? (
                      <>
                        <InfinityIcon className="w-4 h-4 text-primary" /> Lifetime access —
                        unlimited scrapes, never expires.
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-primary" /> {expiryLabel()}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {access.dailyLimit === null
                      ? `${todayCount} scrapes today · unlimited`
                      : `Used ${todayCount} of ${access.dailyLimit} scrapes today (${usagePercent}%)`}
                    {' · '}Up to{' '}
                    <span className="text-foreground font-medium">{access.itemsPerScrape} items</span> per scrape
                  </p>
                </div>
                {access.dailyLimit !== null && (
                  <div className="w-full sm:w-56">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usagePercent !== null && usagePercent >= 90 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${usagePercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* upgrade plans */}
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {access.hasAccess && user.plan !== 'lifetime' ? 'Upgrade' : 'Available plans'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Demo checkout is enabled — no real charge. Connect Stripe/PayPal keys for
                production payments.
              </p>
              <div className="grid sm:grid-cols-3 gap-5">
                {PLAN_META.map((plan) => {
                  const isCurrent = user.plan === plan.id && access.hasAccess && plan.id !== 'trial'
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-2xl border p-6 flex flex-col relative ${
                        plan.highlight
                          ? 'border-primary/60 bg-card shadow-[0_0_30px_rgba(16,185,129,0.12)]'
                          : 'border-border bg-card'
                      }`}
                    >
                      {plan.highlight && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                          Most popular
                        </Badge>
                      )}
                      {plan.id === 'lifetime' && !plan.highlight && (
                        <Badge
                          variant="outline"
                          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border-primary/50 text-primary"
                        >
                          Best value
                        </Badge>
                      )}
                      <h4 className="font-semibold">{plan.name}</h4>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold">${plan.price}</span>
                        <span className="text-sm text-muted-foreground">
                          {plan.durationDays === null
                            ? '/ once'
                            : plan.durationDays === 7
                              ? '/ week'
                              : '/ month'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{plan.tagline}</p>
                      <ul className="mt-4 space-y-2 text-sm flex-1">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feat}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <Button variant="outline" className="mt-5 w-full" disabled>
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          className="mt-5 w-full font-semibold gap-1.5"
                          variant={plan.highlight ? 'default' : 'outline'}
                          onClick={() => setCheckoutPlan(plan.id)}
                        >
                          {user.plan === plan.id ? 'Renew' : 'Subscribe'}
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ============ Footer (sticky bottom) ============ */}
      <footer className="mt-auto border-t border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">ScrapeFlow</span>
            <span>· dynamic web data extraction</span>
          </div>
          <span>
            Scrape responsibly — respect robots.txt and site terms of service.
          </span>
        </div>
      </footer>

      <CheckoutDialog
        open={checkoutPlan !== null}
        onOpenChange={(o) => !o && setCheckoutPlan(null)}
        plan={checkoutPlan}
        onSuccess={subscribeSuccess}
      />
    </div>
  )
}

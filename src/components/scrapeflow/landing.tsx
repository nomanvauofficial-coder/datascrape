'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Globe,
  Zap,
  MousePointerClick,
  Download,
  Database,
  Link2,
  Image as ImageIcon,
  Table2,
  FileText,
  ShieldCheck,
  Infinity as InfinityIcon,
  Check,
  ArrowRight,
  ScanSearch,
  Clock,
  Layers,
} from 'lucide-react'
import { PLAN_META } from '@/lib/types'

interface LandingProps {
  onGetStarted: () => void
  onSignIn: () => void
}

export function Landing({ onGetStarted, onSignIn }: LandingProps) {
  const [demoUrl, setDemoUrl] = useState('')

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDemo = () => {
    onGetStarted()
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ============ Header ============ */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_18px_rgba(16,185,129,0.45)]">
              <Globe className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ScrapeFlow</span>
            <Badge
              variant="outline"
              className="ml-1 border-primary/40 text-primary text-[10px] px-1.5 hidden sm:inline-flex"
            >
              BETA
            </Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">
              Features
            </button>
            <button onClick={() => scrollTo('how')} className="hover:text-foreground transition-colors">
              How it works
            </button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">
              FAQ
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSignIn}>
              Sign in
            </Button>
            <Button size="sm" onClick={onGetStarted}>
              Start free trial
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ============ Hero ============ */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary px-3 py-1 mb-6 gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              No code. No setup. Just paste a link.
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] max-w-3xl mx-auto">
              Turn any website into{' '}
              <span className="text-primary">structured data</span> in seconds
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Paste a category link, product page, or any URL — ScrapeFlow automatically
              extracts products, prices, images, links and tables. Export everything to
              CSV or JSON with one click.
            </p>

            {/* Demo URL bar */}
            <div className="mt-9 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border border-border bg-card/80 shadow-xl">
                <div className="flex items-center flex-1 gap-2 px-3">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDemo()}
                    placeholder="https://example.com/products/category-link"
                    className="w-full bg-transparent text-sm py-2.5 outline-none placeholder:text-muted-foreground/70"
                    aria-label="Website URL to scrape"
                  />
                </div>
                <Button onClick={handleDemo} className="gap-2 h-11 px-5 font-semibold">
                  <ScanSearch className="w-4 h-4" />
                  Start scraping free
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> 1-day free trial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> No credit card required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> 10 scrapes/day on trial
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ How it works ============ */}
        <section id="how" className="border-t border-border/60 bg-card/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
              Three steps. That&apos;s it.
            </h2>
            <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
              ScrapeFlow is built for speed — from link to dataset in under a minute.
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-5">
              {[
                {
                  icon: MousePointerClick,
                  step: 'Step 1',
                  title: 'Paste any link',
                  desc: 'A category page, search results, product listing, blog, table — any public URL works.',
                },
                {
                  icon: ScanSearch,
                  step: 'Step 2',
                  title: 'We extract the data',
                  desc: 'Smart auto-detection finds repeated blocks (products, listings) plus links, images and tables.',
                },
                {
                  icon: Download,
                  step: 'Step 3',
                  title: 'Export your data',
                  desc: 'Preview everything in a clean table, then download as CSV or JSON — ready for Excel or your app.',
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="relative rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/12 border border-primary/25 flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                    {s.step}
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Features ============ */}
        <section id="features" className="border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
              One scraper, every kind of data
            </h2>
            <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
              Choose an extract mode or let auto-detection do the work for you.
            </p>
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: ScanSearch,
                  title: 'Auto-detect listings',
                  desc: 'Detects repeated page blocks — product cards, article lists, directory entries — and structures them automatically.',
                },
                {
                  icon: Database,
                  title: 'Products & prices',
                  desc: 'Purpose-built product extraction pulls titles, prices, images and product links with multi-currency price detection.',
                },
                {
                  icon: Link2,
                  title: 'Link harvesting',
                  desc: 'Grab every link on a page with its anchor text — perfect for crawling research and SEO audits.',
                },
                {
                  icon: ImageIcon,
                  title: 'Image extraction',
                  desc: 'Collect all image URLs with alt text and dimensions in one pass.',
                },
                {
                  icon: Table2,
                  title: 'HTML tables → rows',
                  desc: 'Converts any HTML table into clean rows with headers, ready for your spreadsheet.',
                },
                {
                  icon: FileText,
                  title: 'Text & headings',
                  desc: 'Extract headings, meta descriptions and paragraphs for content analysis and monitoring.',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/12 border border-primary/25 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Pricing ============ */}
        <section id="pricing" className="border-t border-border/60 bg-card/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
              Simple pricing for every need
            </h2>
            <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
              Start with a <span className="text-primary font-medium">free 1-day trial</span> —
              no credit card. Then pick weekly, monthly, or go lifetime.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Trial card */}
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 flex flex-col relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0">
                  Start here
                </Badge>
                <h3 className="font-semibold text-lg">Free Trial</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-sm text-muted-foreground">/ 1 day</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Test the full engine before paying anything.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm flex-1">
                  {[
                    'Full 24-hour access',
                    'Up to 20 items per scrape',
                    '10 scrapes per day',
                    'All 6 extract modes',
                    'CSV & JSON export',
                    'No credit card required',
                  ].map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={onGetStarted} className="mt-6 w-full font-semibold">
                  Start free trial
                </Button>
              </div>

              {/* Paid plans */}
              {PLAN_META.map((plan) => (
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
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {plan.durationDays === null
                        ? '/ once'
                        : plan.durationDays === 7
                          ? '/ week'
                          : '/ month'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                  <ul className="mt-5 space-y-2.5 text-sm flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={onGetStarted}
                    variant={plan.highlight ? 'default' : 'outline'}
                    className={`mt-6 w-full font-semibold ${
                      plan.highlight ? '' : 'border-primary/40 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    Get {plan.name}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <InfinityIcon className="w-3.5 h-3.5 text-primary" />
              Lifetime is a one-time payment — the plan never expires and never renews.
            </p>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" className="border-t border-border/60">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              <AccordionItem value="q1">
                <AccordionTrigger>What kind of links can I scrape?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Any public URL: category and listing pages on e-commerce sites, search
                  result pages, blogs, directories, pages with HTML tables, and more.
                  Auto mode detects repeated blocks (like product cards) automatically;
                  you can also force links, images, tables or text extraction.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>How does the 1-day free trial work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Sign up with just an email — your trial starts immediately and lasts 24
                  hours. You get 10 scrapes per day during the trial, with every extract
                  mode and export unlocked. No credit card is required.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>What happens when my plan expires?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Your saved scrape history stays visible, but new scrapes are paused until
                  you subscribe to a weekly, monthly, or lifetime plan. You can upgrade at
                  any time from the Billing tab — access resumes instantly.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>Which format do I get the data in?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Every scrape can be downloaded as CSV (opens in Excel, Google Sheets) or
                  JSON (for developers and apps). You can also copy the raw JSON directly.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q5">
                <AccordionTrigger>Is it legal to scrape websites?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Scrape public data responsibly. Respect each site&apos;s terms of service,
                  robots.txt, and applicable laws. ScrapeFlow blocks internal/private
                  network addresses and enforces rate limits to encourage fair use.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

      {/* ============ Footer (sticky bottom) ============ */}
      <footer className="mt-auto border-t border-border/60 bg-card/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">ScrapeFlow</span>
            <span className="text-sm text-muted-foreground">
              — dynamic web data extraction
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">
              Pricing
            </button>
            <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">
              FAQ
            </button>
            <button onClick={onGetStarted} className="text-primary hover:underline">
              Start free trial
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

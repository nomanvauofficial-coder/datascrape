import * as cheerio from 'cheerio'
import { lookup } from 'dns/promises'
import type { AnyNode } from 'domhandler'

export type ScrapeMode = 'auto' | 'products' | 'links' | 'images' | 'tables' | 'text'

export interface ScrapeResult {
  finalUrl: string
  pageTitle: string
  pageDescription: string
  mode: ScrapeMode
  items: Record<string, string>[]
  responseTimeMs: number
  truncated: boolean
}

const MAX_ITEMS = 500
const FETCH_TIMEOUT_MS = 25_000
const MAX_BYTES = 8 * 1024 * 1024
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/* ------------------------------ URL safety ------------------------------ */

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '::') return true
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  const parts = ip.split('.').map((n) => parseInt(n, 10))
  if (parts.length !== 4 || parts.some((n) => isNaN(n))) return false
  const [a, b] = parts
  if (a === 127 || a === 10 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

export function normalizeInputUrl(raw: string): string {
  let url = raw.trim()
  if (!url) throw new Error('Please enter a URL.')
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('That does not look like a valid URL.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.')
  }
  return parsed.href
}

async function assertPublicHost(hostname: string): Promise<void> {
  const bare = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (bare === 'localhost' || bare.endsWith('.localhost') || bare.endsWith('.local')) {
    throw new Error('Local and internal addresses cannot be scraped.')
  }
  try {
    const result = await lookup(bare, { all: true })
    for (const { address } of result) {
      if (isPrivateIp(address)) {
        throw new Error('Local and internal addresses cannot be scraped.')
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('cannot be scraped')) throw err
    throw new Error(`Could not resolve host "${hostname}". Check the address and try again.`)
  }
}

/* ------------------------------ fetching ------------------------------ */

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  await assertPublicHost(new URL(url).hostname)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) {
      throw new Error(
        `The site responded with HTTP ${res.status} ${res.statusText}. Some sites block bots — try another URL.`
      )
    }
    const buf = await res.arrayBuffer()
    const bytes = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf
    const html = new TextDecoder('utf-8').decode(bytes)
    return { html, finalUrl: res.url || url }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('The site took too long to respond (25s timeout).')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------ helpers ------------------------------ */

function cleanText(s: string | undefined | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim()
}

function absUrl(base: string, rel: string | undefined): string {
  if (!rel) return ''
  try {
    return new URL(rel, base).href
  } catch {
    return ''
  }
}

const PRICE_RE =
  /(?:US\$|\$|USD\s?|€|£|₹|Rs\.?\s?|Tk\.?\s?|৳|¥|R\$|AED\s?|SAR\s?)\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:USD|EUR|GBP|INR|BDT)/gi

/** Returns up to 2 distinct prices found in text: [current, old] */
function extractPrices(text: string): string[] {
  const matches = text.match(PRICE_RE)
  if (!matches) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of matches) {
    const v = cleanText(m)
    if (v && !seen.has(v)) {
      seen.add(v)
      out.push(v)
      if (out.length >= 2) break
    }
  }
  return out
}

function extractRating(text: string, ariaLabel: string): string {
  const hay = `${ariaLabel} ${text}`
  const m = hay.match(/(\d(?:[.,]\d)?)\s*(?:\/\s*5|out of 5|stars?)/i)
  return m ? cleanText(m[0]) : ''
}

function extractAvailability(text: string): string {
  const m = text.match(/\b(in stock|out of stock|sold out|pre-?order)\b/i)
  return m ? m[1].replace(/\s+/g, ' ').toLowerCase() : ''
}

/* ------------------------- rich item extraction ------------------------- */

type RichItem = Record<string, string>

function itemFromElement(
  $: cheerio.CheerioAPI,
  el: AnyNode,
  base: string,
  position: number
): RichItem | null {
  const $el = $(el)

  /* --- id: element id, or common data attributes on it / descendants --- */
  let id = cleanText($el.attr('id') || '')
  if (!id) {
    const idHolder = $el
      .find(
        '[data-id],[data-product-id],[data-item-id],[data-entity-id],[itemprop="productID"],[data-sku]'
      )
      .first()
    if (idHolder.length > 0) {
      id = cleanText(
        idHolder.attr('data-id') ||
          idHolder.attr('data-product-id') ||
          idHolder.attr('data-item-id') ||
          idHolder.attr('data-entity-id') ||
          idHolder.attr('data-sku') ||
          idHolder.attr('id') ||
          ''
      )
    }
  }

  /* --- name: name / data-name / aria-label attributes --- */
  const name = cleanText(
    $el.attr('name') || $el.attr('data-name') || $el.attr('aria-label') || ''
  )

  /* --- title: heading > longest anchor text > name > own text --- */
  let title = cleanText($el.find('h1,h2,h3,h4,h5,h6').first().text())
  if (!title) {
    let best = ''
    $el.find('a').each((_, a) => {
      const t = cleanText($(a).text())
      if (t.length > best.length) best = t
    })
    title = best
  }
  if (!title) title = cleanText($el.attr('title') || '')
  if (!title) title = name

  /* --- prices (current + old) --- */
  const fullText = cleanText($el.text())
  const prices = extractPrices(fullText)
  const price = prices[0] ?? ''
  const oldPrice = prices[1] ?? ''

  /* --- images (first + extras) --- */
  const srcs: string[] = []
  $el.find('img').each((_, img) => {
    if (srcs.length >= 4) return
    const $img = $(img)
    const s = absUrl(
      base,
      $img.attr('src') ||
        $img.attr('data-src') ||
        $img.attr('data-lazy-src') ||
        $img.attr('data-original') ||
        $img.attr('srcset')?.split(/\s+/)[0] ||
        ''
    )
    if (s && s.startsWith('http') && !srcs.includes(s)) srcs.push(s)
  })
  const image = srcs[0] ?? ''
  const extraImages = srcs.slice(1).join(' | ')

  /* --- link --- */
  const href = $el.find('a[href]').first().attr('href')
  const link = absUrl(base, href)

  /* --- description --- */
  const description = cleanText(
    $el.find('[itemprop="description"]').first().text() ||
      $el.find('p').first().text()
  ).slice(0, 300)

  /* --- rating / availability / sku --- */
  const ariaLabel = cleanText($el.attr('aria-label') || '')
  const rating = extractRating(fullText, ariaLabel)
  const availability = extractAvailability(fullText)
  let sku = cleanText($el.attr('data-sku') || $el.find('[data-sku]').first().attr('data-sku') || '')
  if (!sku) {
    const m = fullText.match(/SKU[:\s]+([A-Z0-9][A-Z0-9_-]{2,24})/i)
    if (m) sku = m[1]
  }

  /* --- raw text + classes --- */
  const text = fullText.slice(0, 400)
  const classAttr = cleanText($el.attr('class') || '').slice(0, 140)

  /* skip junk: needs at least one meaningful structured field */
  if (!title && !name && !id && !price && !image && !link) return null

  const rec: RichItem = {}
  if (id) rec.id = id
  if (name) rec.name = name
  if (title) rec.title = title.slice(0, 200)
  if (price) rec.price = price
  if (oldPrice) rec.old_price = oldPrice
  if (image) rec.image = image
  if (extraImages) rec.images = extraImages
  if (link) rec.link = link
  if (description) rec.description = description
  if (rating) rec.rating = rating
  if (availability) rec.availability = availability
  if (sku) rec.sku = sku
  if (text) rec.text = text
  if (classAttr) rec.class = classAttr
  rec.position = String(position)
  return rec
}

/* --------------------- candidate repeating-group detection --------------------- */

function signatureOf(node: AnyNode): string | null {
  if (node.type !== 'tag') return null
  const el = node as unknown as { tagName: string; attribs?: Record<string, string> }
  const classes = (el.attribs?.['class'] ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => c.replace(/\d+/g, '#'))
    .sort()
  return `${el.tagName}.${classes.join('.')}`
}

interface Candidate {
  name: string
  items: RichItem[]
}

/**
 * Quality score for a candidate group: items carrying real data signals
 * (price, image, rating, sku…) massively outweigh plain link-only groups.
 */
function candidateScore(items: RichItem[]): number {
  let s = 0
  for (const it of items) {
    if (it.price) s += 150
    if (it.old_price) s += 20
    if (it.image) s += 60
    if (it.rating || it.availability || it.sku) s += 40
  }
  return s + items.length
}

function itemsFromNodeList(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  base: string
): RichItem[] {
  const items: RichItem[] = []
  const seen = new Set<string>()
  for (let i = 0; i < nodes.length && items.length < MAX_ITEMS; i++) {
    const it = itemFromElement($, nodes[i], base, i + 1)
    if (!it) continue
    const key = `${it.link ?? ''}|${it.title ?? ''}|${it.image ?? ''}|${it.id ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push(it)
  }
  return items
}

const KNOWN_SELECTORS = [
  '.product-item', '.product-card', '.product-tile', '.product-box', '.product',
  'li.product', '.products li', '.product-list li', '.product-grid > *',
  '.grid__item', '.grid-item', '.listing-item', '.item-card', '.card',
  '[data-testid*="product"]', '[data-product]', '[class*="product-card"]',
  '[class*="product-item"]', '[class*="productItem"]', '[class*="ProductCard"]',
  '.post-card', 'article', '.catalog li', '.category-products li',
]

function collectKnownSelectorCandidates(
  $: cheerio.CheerioAPI,
  base: string
): Candidate[] {
  const candidates: Candidate[] = []
  for (const sel of KNOWN_SELECTORS) {
    try {
      const nodes = $(sel)
      if (nodes.length >= 3 && nodes.length <= MAX_ITEMS * 2) {
        const items = itemsFromNodeList($, nodes.get(), base)
        if (items.length >= 3) candidates.push({ name: sel, items })
      }
    } catch {
      /* invalid selector on this doc — skip */
    }
  }
  return candidates
}

function bestSiblingCandidate(
  $: cheerio.CheerioAPI,
  base: string
): Candidate | null {
  // Pass 1: find the largest sibling group by signature (size first, link/img bonus as tie-break)
  let best: { sig: string; nodes: AnyNode[] } | null = null
  let bestScore = 0
  const all = $('*')
  all.each((_, parent) => {
    const children: AnyNode[] = []
    $(parent)
      .children()
      .each((_, c) => children.push(c))
    if (children.length < 3) return

    const groups = new Map<string, AnyNode[]>()
    for (const c of children) {
      const sig = signatureOf(c)
      if (!sig) continue
      const arr = groups.get(sig) ?? []
      arr.push(c)
      groups.set(sig, arr)
    }
    for (const [sig, nodes] of groups) {
      if (nodes.length < 3) continue
      const hasRich = nodes.some((n) => $(n).find('a, img').length > 0)
      const score = nodes.length * 10 + (hasRich ? 1 : 0)
      if (score > bestScore) {
        bestScore = score
        best = { sig, nodes: nodes.slice(0, MAX_ITEMS) }
      }
    }
  })

  if (!best) return null
  const chosen = best as { sig: string; nodes: AnyNode[] }
  const items = itemsFromNodeList($, chosen.nodes, base)
  if (items.length < 3) return null
  return { name: chosen.sig, items }
}

function detectRepeatingGroup(
  $: cheerio.CheerioAPI,
  base: string
): Candidate | null {
  const candidates: Candidate[] = [
    ...collectKnownSelectorCandidates($, base),
  ]
  const sibling = bestSiblingCandidate($, base)
  if (sibling) candidates.push(sibling)

  if (candidates.length === 0) return null
  // pick the candidate with the best quality × quantity score
  let bestC = candidates[0]
  let bestScore = candidateScore(bestC.items)
  for (const c of candidates) {
    const s = candidateScore(c.items)
    if (s > bestScore) {
      bestScore = s
      bestC = c
    }
  }
  return bestC
}

/* ------------------------------ mode extractors ------------------------------ */

function extractLinks($: cheerio.CheerioAPI, base: string): Record<string, string>[] {
  const seen = new Set<string>()
  const out: Record<string, string>[] = []
  $('a[href]').each((_, el) => {
    if (out.length >= MAX_ITEMS) return
    const $el = $(el)
    const text =
      cleanText($el.text()) ||
      cleanText($el.attr('aria-label') || $el.attr('title') || '')
    const href = absUrl(base, $el.attr('href'))
    if (!href || !href.startsWith('http')) return
    const key = href + '|' + text
    if (seen.has(key)) return
    seen.add(key)
    out.push({ text, href })
  })
  return out
}

function extractImages($: cheerio.CheerioAPI, base: string): Record<string, string>[] {
  const seen = new Set<string>()
  const out: Record<string, string>[] = []
  $('img').each((_, el) => {
    if (out.length >= MAX_ITEMS) return
    const $el = $(el)
    const src = absUrl(
      base,
      $el.attr('src') ||
        $el.attr('data-src') ||
        $el.attr('data-lazy-src') ||
        $el.attr('data-original') ||
        ''
    )
    if (!src || src.startsWith('data:') || seen.has(src)) return
    seen.add(src)
    out.push({
      alt: cleanText($el.attr('alt') || ''),
      src,
      width: $el.attr('width') || '',
      height: $el.attr('height') || '',
    })
  })
  return out
}

function extractTables($: cheerio.CheerioAPI): Record<string, string>[] {
  const out: Record<string, string>[] = []
  const tables = $('table')
  const multi = tables.length > 1
  tables.each((ti, table) => {
    if (ti >= 10 || out.length >= MAX_ITEMS) return
    const $table = $(table)
    let headers: string[] = []
    const firstRow = $table.find('tr').first()
    const thCells = firstRow.find('th')
    if (thCells.length > 0) {
      headers = thCells.map((_, th) => cleanText($(th).text()) || `col_${_ + 1}`).get()
    } else {
      const rowTds = firstRow.find('td')
      if (rowTds.length > 0) {
        headers = rowTds.map((_, td) => cleanText($(td).text()) || `col_${_ + 1}`).get()
      }
    }
    $table.find('tr').each((ri, tr) => {
      if (out.length >= MAX_ITEMS) return
      const cells = $(tr).find('th,td')
      if (cells.length === 0) return
      if (ri === 0 && headers.length === cells.length && thCells.length > 0) return
      const rec: Record<string, string> = {}
      if (multi) rec['_table'] = `Table ${ti + 1}`
      cells.each((ci, td) => {
        const key =
          headers[ci] && !headers.slice(0, ci).includes(headers[ci])
            ? headers[ci]
            : `column_${ci + 1}`
        rec[key] = cleanText($(td).text())
      })
      if (Object.keys(rec).some((k) => rec[k] !== '')) out.push(rec)
    })
  })
  return out
}

function extractText($: cheerio.CheerioAPI): Record<string, string>[] {
  const out: Record<string, string>[] = []
  const pageTitle = cleanText($('title').first().text())
  if (pageTitle) out.push({ type: 'page_title', text: pageTitle })
  const metaDesc = cleanText($('meta[name="description"]').attr('content'))
  if (metaDesc) out.push({ type: 'meta_description', text: metaDesc })

  $('h1, h2, h3').each((_, el) => {
    if (out.length >= MAX_ITEMS) return
    const text = cleanText($(el).text())
    if (text) out.push({ type: `heading_${(el as unknown as { tagName: string }).tagName}`, text })
  })
  $('p').each((_, el) => {
    if (out.length >= MAX_ITEMS) return
    const text = cleanText($(el).text())
    if (text.length > 40) out.push({ type: 'paragraph', text: text.slice(0, 500) })
  })
  return out
}

/* ------------------------------ main entry ------------------------------ */

export async function scrapeUrl(
  rawUrl: string,
  mode: ScrapeMode
): Promise<ScrapeResult> {
  const url = normalizeInputUrl(rawUrl)
  const started = Date.now()
  const { html, finalUrl } = await fetchPage(url)
  const $ = cheerio.load(html)

  const pageTitle = cleanText($('title').first().text())
  const pageDescription = cleanText(
    $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      ''
  )

  let items: Record<string, string>[] = []
  let truncated = false

  if (mode === 'links') {
    items = extractLinks($, finalUrl)
  } else if (mode === 'images') {
    items = extractImages($, finalUrl)
  } else if (mode === 'tables') {
    items = extractTables($)
  } else if (mode === 'text') {
    items = extractText($)
  } else {
    // auto & products
    const group = detectRepeatingGroup($, finalUrl)
    if (group) {
      items = group.items
    }
    if (mode === 'products') {
      const priced = items.filter((i) => i.price)
      if (priced.length >= 3) items = priced
    }
    // fallback: nothing detected → give links so the user still gets value
    if (items.length < 3) {
      items = extractLinks($, finalUrl).slice(0, 100)
    }
  }

  if (items.length > MAX_ITEMS) {
    items = items.slice(0, MAX_ITEMS)
    truncated = true
  }

  return {
    finalUrl,
    pageTitle,
    pageDescription,
    mode,
    items,
    responseTimeMs: Date.now() - started,
    truncated,
  }
}

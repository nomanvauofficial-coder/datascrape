'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileJson, FileSpreadsheet, Copy, Check, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { toCsv, downloadFile, type ScrapeItem } from '@/lib/types'

const IMAGE_KEYS = ['image', 'img', 'src', 'thumbnail', 'photo', 'picture']
const LINK_KEYS = ['link', 'href', 'url']

interface ResultsTableProps {
  items: ScrapeItem[]
  sourceUrl: string
  mode: string
  responseTimeMs?: number
  truncated?: boolean
  foundCount?: number
  planLimit?: number
}

export function ResultsTable({
  items,
  sourceUrl,
  mode,
  responseTimeMs,
  truncated,
  foundCount,
  planLimit,
}: ResultsTableProps) {
  const [copied, setCopied] = useState(false)

  const columns = useMemo(() => {
    const keys: string[] = []
    const seen = new Set<string>()
    const scan = items.slice(0, 50)
    for (const item of scan) {
      for (const k of Object.keys(item)) {
        if (!seen.has(k)) {
          seen.add(k)
          keys.push(k)
        }
      }
    }
    // cap displayed columns for readability (export gets all)
    return keys.slice(0, 14)
  }, [items])

  const exportColumns = useMemo(() => {
    const keys: string[] = []
    const seen = new Set<string>()
    for (const item of items) {
      for (const k of Object.keys(item)) {
        if (!seen.has(k)) {
          seen.add(k)
          keys.push(k)
        }
      }
    }
    return keys.slice(0, 24)
  }, [items])

  const cellValue = (item: ScrapeItem, col: string) => {
    const v = item[col] ?? ''
    if (!v) return ''
    if (v.length > 160) return v.slice(0, 160) + '…'
    return v
  }

  const isImageCol = (col: string) =>
    IMAGE_KEYS.some((k) => col.toLowerCase().includes(k))
  const isLinkCol = (col: string) =>
    LINK_KEYS.some((k) => col.toLowerCase() === k)

  const stamp = new Date().toISOString().slice(0, 10)

  const exportCsv = () => {
    downloadFile(toCsv(items, exportColumns), `scrapeflow-${mode}-${stamp}.csv`, 'text/csv;charset=utf-8')
    toast({ title: 'CSV downloaded', description: `${items.length} rows × ${exportColumns.length} columns exported.` })
  }

  const exportJson = () => {
    downloadFile(
      JSON.stringify(items, null, 2),
      `scrapeflow-${mode}-${stamp}.json`,
      'application/json'
    )
    toast({ title: 'JSON downloaded', description: `${items.length} records exported.` })
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(items, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Copied', description: 'Raw JSON copied to clipboard.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard not available.', variant: 'destructive' })
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
        No data was extracted. Try another URL or a different extract mode.
      </div>
    )
  }

  const planCapped =
    foundCount !== undefined && planLimit !== undefined && foundCount > items.length

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{items.length}</span>
          {planCapped && (
            <span>
              {' '}
              of <span className="font-semibold text-amber-400">{foundCount} found</span>
            </span>
          )}{' '}
          records
          {planLimit !== undefined && planCapped && (
            <span className="ml-2 text-amber-500">(plan limit: {planLimit}/scrape)</span>
          )}
          {responseTimeMs !== undefined && (
            <span className="inline-flex items-center gap-1 ml-3">
              <Clock className="w-3.5 h-3.5" />
              {(responseTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          {truncated && (
            <span className="ml-3 text-amber-500">showing first {items.length} rows</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyJson} className="gap-1.5">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copy JSON
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 font-semibold">
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv} className="gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" /> CSV (Excel / Sheets)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJson} className="gap-2">
                <FileJson className="w-4 h-4 text-primary" /> JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="max-h-[480px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent border-b border-border bg-card">
                <TableHead className="w-10 text-muted-foreground">#</TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="font-semibold text-foreground/90 capitalize">
                    {col.replace(/_/g, ' ')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice(0, 300).map((item, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  {columns.map((col) => (
                    <TableCell key={col} className="max-w-[280px] align-middle">
                      {isImageCol(col) && item[col] ? (
                        <img
                          src={item[col]}
                          alt={item.title || 'scraped image'}
                          loading="lazy"
                          className="h-10 w-10 rounded-md object-cover border border-border"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : isLinkCol(col) && item[col] && item[col].startsWith('http') ? (
                        <a
                          href={item[col]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:opacity-80 block truncate max-w-[260px]"
                          title={item[col]}
                        >
                          {cellValue(item, col)}
                        </a>
                      ) : (
                        <span
                          className="block truncate text-sm"
                          title={item[col]?.slice(0, 200)}
                        >
                          {cellValue(item, col)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground truncate" title={sourceUrl}>
        Source: {sourceUrl} · mode: {mode}
        {items.length > 300 && ` · previewing first 300 of ${items.length} rows (export for all)`}
      </p>
    </div>
  )
}

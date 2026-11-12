'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These two values are PUBLIC by design (safe to ship to the browser).
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rkhfljmclltrjjvhxcjd.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_4Qu2QMzBTOrisGtFZ83cRA_sVnUM0tc'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return client
}

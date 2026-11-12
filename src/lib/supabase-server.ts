import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL_ =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rkhfljmclltrjjvhxcjd.supabase.co'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_4Qu2QMzBTOrisGtFZ83cRA_sVnUM0tc'

const noSession = { persistSession: false, autoRefreshToken: false } as const

/** Client that acts AS the logged-in user — Row Level Security applies. */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(URL_, ANON, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/** Privileged client (bypasses RLS). Only for trusted server code such as billing. */
export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(URL_, key, { auth: noSession })
}

export { URL_ as SUPABASE_URL }

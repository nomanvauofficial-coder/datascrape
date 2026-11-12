import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { userClient, adminClient } from '@/lib/supabase-server'

export interface AuthedUser {
  id: string
  email: string
  name: string | null
  plan: string
  planExpiresAt: Date | null
  trialEndsAt: Date
  createdAt: Date
  /** Supabase client that acts as this user (RLS enforced). */
  db: SupabaseClient
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  return null
}

/** Verifies the Supabase access token and loads the user's profile. */
export async function getUserFromRequest(req: NextRequest): Promise<AuthedUser | null> {
  const token = getTokenFromRequest(req)
  if (!token) return null

  const db = userClient(token)
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  const authUser = data.user

  let { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  // Safety net: account created before the DB trigger existed → create the profile now.
  if (!profile) {
    const trialEnds = new Date(new Date(authUser.created_at).getTime() + 24 * 60 * 60 * 1000)
    const admin = adminClient()
    if (admin) {
      const { data: created } = await admin
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email ?? '',
          name: (authUser.user_metadata?.name as string | undefined) ?? null,
          plan: 'trial',
          trial_ends_at: trialEnds.toISOString(),
          plan_expires_at: trialEnds.toISOString(),
        })
        .select('*')
        .single()
      profile = created
    }
    if (!profile) {
      profile = {
        id: authUser.id,
        email: authUser.email ?? '',
        name: (authUser.user_metadata?.name as string | undefined) ?? null,
        plan: 'trial',
        plan_expires_at: trialEnds.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        created_at: authUser.created_at,
      }
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    plan: profile.plan,
    planExpiresAt: profile.plan_expires_at ? new Date(profile.plan_expires_at) : null,
    trialEndsAt: new Date(profile.trial_ends_at),
    createdAt: new Date(profile.created_at),
    db,
  }
}

export function publicUser(user: Omit<AuthedUser, 'db'>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    trialEndsAt: user.trialEndsAt,
    createdAt: user.createdAt,
  }
}

export type PublicUser = ReturnType<typeof publicUser>

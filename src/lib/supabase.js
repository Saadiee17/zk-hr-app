import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

/**
 * Initialize and export the Supabase client for server-side operations
 * Uses SUPABASE_SERVICE_ROLE_KEY which has full database access
 * ⚠️ WARNING: Only use this on the server side, never expose to client
 */
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * PostgreSQL client for direct database access
 * Useful for complex queries or raw SQL operations
 * Only use this if you need direct PostgreSQL access
 */
export const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL)
  : null

/**
 * Client-side Supabase client (using anon key)
 * Use this for client-side operations that go through Supabase API
 * with Row Level Security (RLS) policies
 */
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
)

export default supabase


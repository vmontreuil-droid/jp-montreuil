import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Webshop-specifieke Supabase clients. Alle queries gaan automatisch
 * naar het `shop` schema (geport van allardphilippe, geïsoleerd van
 * de bestaande jp-montreuil tabellen in `public`).
 *
 * Vereist: in Supabase Dashboard → Project Settings → API → Data API
 * Settings → Exposed schemas moet 'shop' aangevinkt staan, anders kan
 * PostgREST de tabellen niet bereiken.
 */

const SHOP_SCHEMA = 'shop'

/** Service-role client — bypasst RLS, voor admin-routes. */
export function createShopAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin configuratie ontbreekt voor /shop.')
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: SHOP_SCHEMA },
  })
}

/**
 * Server-side cookie-based client — gebruikt voor RLS-aware reads
 * binnen Server Components. Schema = 'shop'.
 */
export async function createShopServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase publieke configuratie ontbreekt voor /shop.')
  }
  const cookieStore = await cookies()
  return createServerClient(url, key, {
    db: { schema: SHOP_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookies) {
        try {
          for (const c of cookies) cookieStore.set(c.name, c.value, c.options)
        } catch {
          // setAll kan in een Server Component gooien — veilig negeren
        }
      },
    },
  })
}

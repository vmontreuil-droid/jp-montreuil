import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const typeRaw = searchParams.get('type')
  const next = searchParams.get('next') ?? '/admin'

  // Fout-redirect afhankelijk van de gevraagde flow (admin vs portail)
  const isPortailFlow = next.startsWith('/portail') || next.startsWith('/nl/portail')
  const errorRedirect = isPortailFlow
    ? `${origin}/portail/login?error=auth_callback`
    : `${origin}/admin/login?error=auth_callback`

  // Flow 1: PKCE — client-side signInWithOtp/OAuth zet code_verifier cookie,
  // wij wisselen de ?code in voor een sessie.
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Flow 2: Admin-gegenereerde magic-link — geen code_verifier nodig,
  // we verifiëren rechtstreeks via token_hash + type.
  if (tokenHash && typeRaw) {
    const allowedTypes = ['magiclink', 'recovery', 'invite', 'signup', 'email_change'] as const
    type AllowedType = (typeof allowedTypes)[number]
    const type = (allowedTypes as readonly string[]).includes(typeRaw)
      ? (typeRaw as AllowedType)
      : null
    if (type) {
      const supabase = await createClient()
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(errorRedirect)
}

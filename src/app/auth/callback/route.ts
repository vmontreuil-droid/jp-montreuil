import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  // Fout-redirect afhankelijk van de gevraagde flow (admin vs portail)
  const isPortailFlow = next.startsWith('/portail') || next.startsWith('/nl/portail')
  const errorRedirect = isPortailFlow
    ? `${origin}/portail/login?error=auth_callback`
    : `${origin}/admin/login?error=auth_callback`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(errorRedirect)
}

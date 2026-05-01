import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale } from '@/i18n/config'

/**
 * URL-prefix i18n routing.
 * - FR is default → geen URL-prefix (`/`, `/contact`, `/galerie/chevaux`).
 * - NL heeft prefix → `/nl/`, `/nl/contact`, `/nl/galerie/chevaux`.
 *
 * Alle publieke pagina's leven onder `src/app/[locale]/`. Deze proxy doet een
 * rewrite zodat de URL onaangeroerd blijft maar Next de juiste route vindt.
 * De gedetecteerde locale wordt via header `x-locale` doorgegeven.
 */
// Canoniek host voor productie. Niet-canonieke productie-hosts
// (www.montreuil.be, jp.montreuil.be) krijgen 308-redirect naar apex.
const CANONICAL_HOST = 'montreuil.be'
const REDIRECT_HOSTS = new Set([`www.${CANONICAL_HOST}`, `jp.${CANONICAL_HOST}`])

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const host = request.headers.get('host')?.toLowerCase() ?? ''

  // 1. Redirect niet-canonieke productie-hosts naar apex
  if (REDIRECT_HOSTS.has(host)) {
    const target = new URL(request.url)
    target.host = CANONICAL_HOST
    target.protocol = 'https:'
    return NextResponse.redirect(target, 308)
  }

  const firstSegment = pathname.split('/')[1] ?? ''
  const requestHeaders = new Headers(request.headers)
  // Bewaar de originele (zichtbare) URL — na rewrite is die niet meer leesbaar
  // via headers/usePathname. Server components hebben dit nodig voor o.a. de
  // taalswitch-link.
  requestHeaders.set('x-pathname', pathname)

  if (isLocale(firstSegment)) {
    requestHeaders.set('x-locale', firstSegment)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  requestHeaders.set('x-locale', defaultLocale)
  const target = new URL(`/${defaultLocale}${pathname}${search}`, request.url)
  return NextResponse.rewrite(target, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!admin|api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
}

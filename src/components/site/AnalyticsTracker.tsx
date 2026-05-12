'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const SESSION_KEY = '__atelier_sid'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = (crypto as Crypto & { randomUUID?: () => string }).randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * Detecteert headless browsers (Playwright, Puppeteer, Selenium, …) zodat
 * e2e-tests en crawlers niet meegeteld worden in de visitor-stats.
 *  - navigator.webdriver = true bij elke gestuurde browser
 *  - userAgent met "HeadlessChrome" bij default Playwright-build
 *  - lege plugins-array komt vaak voor bij bots
 */
function isHeadlessClient(): boolean {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver) return true
  const ua = navigator.userAgent || ''
  if (/HeadlessChrome|Playwright|puppeteer|Selenium|PhantomJS|Cypress/i.test(ua)) return true
  return false
}

/**
 * Stuurt page-view events naar /api/analytics. Anoniem (sessionStorage-id),
 * geen cookies. /admin en /api worden niet getrackt.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const sentRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return
    if (isHeadlessClient()) return
    // Voorkom dubbel-tellen bij Strict Mode of snelle re-renders
    if (sentRef.current === pathname) return
    sentRef.current = pathname

    const sid = getSessionId()
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_type: 'page_view',
        path: pathname,
        referrer: document.referrer || null,
        session_id: sid,
        ua: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(() => {
      /* fail silent — analytics mag UX nooit breken */
    })
  }, [pathname])

  return null
}

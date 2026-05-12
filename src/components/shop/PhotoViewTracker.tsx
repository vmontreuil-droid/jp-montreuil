'use client'

import { useEffect, useRef } from 'react'

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

function isHeadlessClient(): boolean {
  if (typeof navigator === 'undefined') return false
  if (navigator.webdriver) return true
  const ua = navigator.userAgent || ''
  return /HeadlessChrome|Playwright|puppeteer|Selenium|PhantomJS|Cypress/i.test(ua)
}

/**
 * Track een shop_photo_view event op /shop/boutique/photo/[slug].
 * Eenmalig per pageload (sentRef voorkomt re-runs in Strict Mode).
 */
export default function PhotoViewTracker({
  photoId,
  path,
}: {
  photoId: string
  path: string
}) {
  const sentRef = useRef<string | null>(null)

  useEffect(() => {
    if (sentRef.current === photoId) return
    sentRef.current = photoId
    if (isHeadlessClient()) return
    const sid = getSessionId()
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_type: 'shop_photo_view',
        path,
        session_id: sid,
        ua: navigator.userAgent,
        shop_photo_id: photoId,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {})
  }, [photoId, path])

  return null
}

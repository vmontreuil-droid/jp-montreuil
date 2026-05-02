'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Link as LinkIcon, Check, Share2 } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { localePath } from '@/lib/links'

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.88v-6.99H7.9v-2.89h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.89h-2.33V22c4.78-.75 8.44-4.88 8.44-9.94z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

type Props = {
  /** Volledige URL die gedeeld wordt; als leeg → window.location.href */
  url?: string
  /** Titel voor de gedeelde link */
  title: string
  /** "compact" = enkel iconen op donkere bg (voor lightbox); anders volledige row met label */
  compact?: boolean
  /** Klasse op container */
  className?: string
  /** Locale voor de contact-link op het envelope-icoon */
  locale: Locale
}

export default function ShareButtons({ url, title, compact = false, className = '', locale }: Props) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  const targetUrl =
    url ?? (typeof window !== 'undefined' ? window.location.href : '')

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${title} — ${targetUrl}`)}`
  const contactHref = localePath(locale, '/contact')

  async function copy() {
    try {
      await navigator.clipboard.writeText(targetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    if (typeof navigator === 'undefined' || !navigator.share) return false
    try {
      await navigator.share({ title, url: targetUrl })
      setShared(true)
      setTimeout(() => setShared(false), 1500)
      return true
    } catch {
      return false
    }
  }

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  const baseBtn = compact
    ? 'inline-flex items-center justify-center w-9 h-9 backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors'
    : 'inline-flex items-center justify-center w-10 h-10 rounded-full border border-(--color-frame) text-(--color-stone) hover:border-(--color-bronze) hover:text-(--color-bronze) transition-colors'

  return (
    <div className={`${className} ${compact ? '' : 'flex flex-col gap-3'}`}>
      {!compact && (
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Partager</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {hasNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            aria-label="Partager"
            className={baseBtn}
          >
            {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
        )}
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          className={baseBtn}
        >
          <FacebookIcon className="w-4 h-4" />
        </a>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className={baseBtn}
        >
          <WhatsAppIcon className="w-4 h-4" />
        </a>
        <Link
          href={contactHref}
          aria-label={locale === 'fr' ? 'Contact' : 'Contact'}
          className={baseBtn}
        >
          <Mail className="w-4 h-4" />
        </Link>
        <button
          type="button"
          onClick={copy}
          aria-label="Copier le lien"
          className={`${baseBtn} ${copied ? (compact ? 'text-(--color-bronze)' : 'border-(--color-bronze) text-(--color-bronze)') : ''}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Image as ImageIcon,
  Upload,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Share2,
  Globe,
  Eye,
} from 'lucide-react'
import { workImageUrl } from '@/lib/links'
import TranslateButton from '@/components/admin/TranslateButton'

export type ComposerCategory = {
  id: string
  slug: string
  label_fr: string
  label_nl: string
}

export type ComposerWork = {
  id: string
  category_id: string
  storage_path: string
  title_fr: string | null
  title_nl: string | null
  year: number | null
  technique_fr: string | null
  technique_nl: string | null
  dimensions: string | null
}

type Source = 'work' | 'upload' | 'none'
type LinkTarget = 'home' | 'category' | 'custom'

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
  categories: ComposerCategory[]
  works: ComposerWork[]
}

export default function ShareComposer({ categories, works }: Props) {
  const [source, setSource] = useState<Source>('work')
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.slug ?? '')
  const [pickedWorkId, setPickedWorkId] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  const [linkTarget, setLinkTarget] = useState<LinkTarget>('home')
  const [customLink, setCustomLink] = useState<string>('')

  const [captionFr, setCaptionFr] = useState<string>('')
  const [captionNl, setCaptionNl] = useState<string>('')

  const [copyState, setCopyState] = useState<{ key: string } | null>(null)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Web Share API detectie — alleen client-side
  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && 'share' in navigator)
    setCanShareFiles(
      typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        typeof (navigator as Navigator & { canShare?: (data: ShareData) => boolean }).canShare ===
          'function'
    )
  }, [])

  // Object-URL beheer voor uploaded image
  useEffect(() => {
    if (!uploadedFile) {
      setUploadedUrl(null)
      return
    }
    const url = URL.createObjectURL(uploadedFile)
    setUploadedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadedFile])

  const worksInCat = useMemo(() => {
    const cat = categories.find((c) => c.slug === activeCat)
    if (!cat) return []
    return works.filter((w) => w.category_id === cat.id)
  }, [activeCat, categories, works])

  const pickedWork = useMemo(
    () => works.find((w) => w.id === pickedWorkId) ?? null,
    [pickedWorkId, works]
  )

  const pickedWorkCategory = useMemo(
    () => (pickedWork ? categories.find((c) => c.id === pickedWork.category_id) ?? null : null),
    [pickedWork, categories]
  )

  // Site origin — fallback naar window.location.origin
  const siteOrigin = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_SITE_URL
    if (env) return env.replace(/\/$/, '')
    if (typeof window !== 'undefined') return window.location.origin
    return 'https://montreuil.be'
  }, [])

  // Resolved share-URL volgens linkTarget keuze
  const shareUrl = useMemo(() => {
    if (linkTarget === 'custom') return customLink.trim() || siteOrigin
    if (linkTarget === 'category') {
      const cat = pickedWorkCategory ?? categories.find((c) => c.slug === activeCat) ?? null
      if (cat) return `${siteOrigin}/galerie/${cat.slug}`
      return siteOrigin
    }
    return siteOrigin
  }, [linkTarget, customLink, pickedWorkCategory, categories, activeCat, siteOrigin])

  // Auto-suggest category-link wanneer een ander werk gekozen wordt.
  // Eénmalig per nieuwe werk-pick — daarna respecteren we de keuze van
  // de gebruiker (anders kon je 'Page d'accueil' niet meer aanklikken
  // zolang er een werk geselecteerd was).
  const lastAutoSuggestedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!pickedWork) {
      lastAutoSuggestedFor.current = null
      return
    }
    if (lastAutoSuggestedFor.current === pickedWork.id) return
    lastAutoSuggestedFor.current = pickedWork.id
    setLinkTarget((prev) => (prev === 'home' ? 'category' : prev))
  }, [pickedWork])

  // Caption-suggestie bij werk-pick (alleen als beide caption-velden leeg zijn)
  useEffect(() => {
    if (!pickedWork) return
    if (captionFr.trim() || captionNl.trim()) return
    const titleFr = pickedWork.title_fr || ''
    const titleNl = pickedWork.title_nl || ''
    const yearStr = pickedWork.year ? ` · ${pickedWork.year}` : ''
    const techFr = pickedWork.technique_fr ? `\n${pickedWork.technique_fr}` : ''
    const techNl = pickedWork.technique_nl ? `\n${pickedWork.technique_nl}` : ''
    const dim = pickedWork.dimensions ? `\n${pickedWork.dimensions}` : ''
    if (titleFr) setCaptionFr(`${titleFr}${yearStr}${techFr}${dim}`.trim())
    if (titleNl) setCaptionNl(`${titleNl}${yearStr}${techNl}${dim}`.trim())
  }, [pickedWork, captionFr, captionNl])

  // Welke image is actief?
  const activeImage = useMemo<{ url: string; filename: string } | null>(() => {
    if (source === 'work' && pickedWork) {
      const filename = pickedWork.storage_path.split('/').pop() || 'oeuvre.jpg'
      return { url: workImageUrl(pickedWork.storage_path), filename }
    }
    if (source === 'upload' && uploadedFile && uploadedUrl) {
      return { url: uploadedUrl, filename: uploadedFile.name }
    }
    return null
  }, [source, pickedWork, uploadedFile, uploadedUrl])

  function flashCopy(key: string) {
    setCopyState({ key })
    setTimeout(() => setCopyState((s) => (s?.key === key ? null : s)), 1500)
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      flashCopy(key)
    } catch {
      // ignore
    }
  }

  async function handleNativeShare(caption: string) {
    if (!hasNativeShare) return
    const data: ShareData = {
      title: 'Atelier Montreuil',
      text: caption ? `${caption}\n\n${shareUrl}` : shareUrl,
      url: shareUrl,
    }

    // Probeer ook image mee te sturen (werkt op iOS Safari + Chrome Android)
    if (canShareFiles && activeImage) {
      try {
        const res = await fetch(activeImage.url)
        const blob = await res.blob()
        const file = new File([blob], activeImage.filename, { type: blob.type })
        const dataWithFile: ShareData = { ...data, files: [file] }
        const nav = navigator as Navigator & { canShare: (d: ShareData) => boolean }
        if (nav.canShare(dataWithFile)) {
          await navigator.share(dataWithFile)
          return
        }
      } catch {
        // val terug op share zonder file
      }
    }

    try {
      await navigator.share(data)
    } catch {
      // user cancelled — geen melding
    }
  }

  async function downloadImage() {
    if (!activeImage) return
    try {
      const res = await fetch(activeImage.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeImage.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // ignore
    }
  }

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`

  function whatsappShareUrl(caption: string): string {
    const body = caption ? `${caption}\n\n${shareUrl}` : shareUrl
    return `https://wa.me/?text=${encodeURIComponent(body)}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* === LINKER KOLOM — composer === */}
      <div className="space-y-6">
        {/* 1. Foto-bron */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            1. Photo
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSource('work')}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
                source === 'work'
                  ? 'border-(--color-bronze) text-(--color-ink)'
                  : 'border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal)'
              }`}
            >
              <ImageIcon className="w-3 h-3 inline mr-1.5" />
              Galerie
            </button>
            <button
              type="button"
              onClick={() => setSource('upload')}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
                source === 'upload'
                  ? 'border-(--color-bronze) text-(--color-ink)'
                  : 'border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal)'
              }`}
            >
              <Upload className="w-3 h-3 inline mr-1.5" />
              Importer
            </button>
            <button
              type="button"
              onClick={() => setSource('none')}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] border transition-colors ${
                source === 'none'
                  ? 'border-(--color-bronze) text-(--color-ink)'
                  : 'border-(--color-frame) text-(--color-stone) hover:text-(--color-charcoal)'
              }`}
            >
              Sans photo
            </button>
          </div>

          {source === 'work' && (
            <div>
              <select
                value={activeCat}
                onChange={(e) => {
                  setActiveCat(e.target.value)
                  setPickedWorkId(null)
                }}
                className="w-full px-3 py-2 mb-3 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.label_fr}
                  </option>
                ))}
              </select>
              {worksInCat.length === 0 ? (
                <p className="text-sm text-(--color-stone) text-center py-6">
                  Aucune œuvre dans cette catégorie.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                  {worksInCat.map((w) => {
                    const picked = w.id === pickedWorkId
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setPickedWorkId(picked ? null : w.id)}
                        className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                          picked
                            ? 'border-(--color-bronze)'
                            : 'border-transparent hover:border-(--color-frame)'
                        }`}
                        title={w.title_fr || ''}
                      >
                        <Image
                          src={workImageUrl(w.storage_path)}
                          alt={w.title_fr || ''}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                        {picked && (
                          <div className="absolute inset-0 bg-(--color-bronze)/30 flex items-center justify-center">
                            <Check className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {source === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setUploadedFile(f)
                }}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 shrink-0 bg-(--color-canvas) border border-(--color-frame) overflow-hidden">
                    {uploadedUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={uploadedUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--color-ink) truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-(--color-stone)">
                      {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-1.5 border border-(--color-frame) hover:border-(--color-bronze) text-(--color-stone) hover:text-(--color-bronze)"
                    aria-label="Retirer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 border-2 border-dashed border-(--color-frame) hover:border-(--color-bronze) text-(--color-stone) hover:text-(--color-bronze) transition-colors"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Cliquer pour choisir une image</span>
                </button>
              )}
            </div>
          )}

          {source === 'none' && (
            <p className="text-sm text-(--color-stone) py-2">
              Le post sera partagé sans photo (juste texte + lien).
            </p>
          )}
        </section>

        {/* 2. Lien à partager */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            2. Lien
          </h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-(--color-charcoal) cursor-pointer">
              <input
                type="radio"
                name="linkTarget"
                checked={linkTarget === 'home'}
                onChange={() => setLinkTarget('home')}
                className="accent-(--color-bronze)"
              />
              <Globe className="w-4 h-4 text-(--color-stone)" />
              Page d&apos;accueil
              <span className="text-xs text-(--color-stone) ml-auto truncate">{siteOrigin}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-(--color-charcoal) cursor-pointer">
              <input
                type="radio"
                name="linkTarget"
                checked={linkTarget === 'category'}
                onChange={() => setLinkTarget('category')}
                className="accent-(--color-bronze)"
              />
              <ImageIcon className="w-4 h-4 text-(--color-stone)" />
              Catégorie {pickedWorkCategory?.label_fr ?? '(aucune sélection)'}
            </label>
            <label className="flex items-center gap-2 text-sm text-(--color-charcoal) cursor-pointer">
              <input
                type="radio"
                name="linkTarget"
                checked={linkTarget === 'custom'}
                onChange={() => setLinkTarget('custom')}
                className="accent-(--color-bronze)"
              />
              <ExternalLink className="w-4 h-4 text-(--color-stone)" />
              URL personnalisée
            </label>
            {linkTarget === 'custom' && (
              <input
                type="url"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="https://montreuil.be/…"
                className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none"
              />
            )}
          </div>
          <p className="mt-3 text-xs text-(--color-stone) truncate">
            <span className="opacity-70">URL :</span>{' '}
            <span className="text-(--color-charcoal)">{shareUrl}</span>
          </p>
        </section>

        {/* 3. Caption — FR + NL */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5 space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">3. Texte</h2>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="caption-fr"
                className="text-xs uppercase tracking-[0.15em] text-(--color-stone)"
              >
                Français
              </label>
              <TranslateButton
                getSource={() => captionFr}
                from="fr"
                to="nl"
                label="→ NL"
                onTranslated={(t) => setCaptionNl(t)}
              />
            </div>
            <textarea
id="caption-fr"
              value={captionFr}
              onChange={(e) => setCaptionFr(e.target.value)}
              rows={4}
              placeholder="Texte du post en français…"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="caption-nl"
                className="text-xs uppercase tracking-[0.15em] text-(--color-stone)"
              >
                Nederlands
              </label>
              <TranslateButton
                getSource={() => captionNl}
                from="nl"
                to="fr"
                label="→ FR"
                onTranslated={(t) => setCaptionFr(t)}
              />
            </div>
            <textarea
id="caption-nl"
              value={captionNl}
              onChange={(e) => setCaptionNl(e.target.value)}
              rows={4}
              placeholder="Tekst van de post in het Nederlands…"
              className="w-full px-3 py-2 bg-(--color-canvas) border border-(--color-frame) text-(--color-ink) text-sm focus:border-(--color-bronze) focus:outline-none resize-y"
            />
          </div>
        </section>
      </div>

      {/* === RECHTER KOLOM — preview + share === */}
      <div className="space-y-6 lg:sticky lg:top-6 self-start">
        {/* Preview */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </h2>
          {activeImage ? (
            <div className="relative aspect-video bg-(--color-canvas) border border-(--color-frame) overflow-hidden mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.url}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="aspect-video bg-(--color-canvas) border border-(--color-frame) flex items-center justify-center mb-3 text-(--color-stone)">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
          )}
          {(captionFr || captionNl) && (
            <div className="space-y-2 text-sm text-(--color-charcoal)">
              {captionFr && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
                    FR
                  </p>
                  <p className="whitespace-pre-wrap">{captionFr}</p>
                </div>
              )}
              {captionNl && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-0.5">
                    NL
                  </p>
                  <p className="whitespace-pre-wrap">{captionNl}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Share-acties */}
        <section className="bg-(--color-paper) border border-(--color-frame) p-5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">
            4. Partager
          </h2>

          {/* Native share — primaire actie op mobile */}
          {hasNativeShare && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-(--color-stone)">Partage natif (recommandé sur mobile) :</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleNativeShare(captionFr)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em]"
                >
                  <Share2 className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleNativeShare(captionNl)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-sm uppercase tracking-[0.15em]"
                >
                  <Share2 className="w-4 h-4" />
                  NL
                </button>
              </div>
              <p className="text-[11px] text-(--color-stone)">
                Ouvre le menu natif avec photo, texte et lien — choisissez Facebook, WhatsApp,
                Messenger, etc.
              </p>
            </div>
          )}

          {/* Per-platform fallbacks */}
          <div className="space-y-3">
            {(['fr', 'nl'] as const).map((lng) => {
              const caption = lng === 'fr' ? captionFr : captionNl
              const langLabel = lng === 'fr' ? 'Français' : 'Nederlands'
              return (
                <div
                  key={lng}
                  className="border border-(--color-frame) p-3 bg-(--color-canvas)/50"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-(--color-stone) mb-2">
                    {langLabel}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          caption ? `${caption}\n\n${shareUrl}` : shareUrl,
                          `copy-${lng}`
                        )
                      }
                      disabled={!caption && !shareUrl}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-2 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs disabled:opacity-50"
                      title="Copier le texte + lien"
                    >
                      {copyState?.key === `copy-${lng}` ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copier
                    </button>
                    <a
                      href={facebookShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-2 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs"
                      title="Ouvrir le partage Facebook (lien uniquement — texte à coller)"
                    >
                      <FacebookIcon className="w-3.5 h-3.5" />
                      Facebook
                    </a>
                    <a
                      href={whatsappShareUrl(caption)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-2 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs"
                      title="Ouvrir WhatsApp avec texte + lien"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Foto downloaden */}
          {activeImage && (
            <button
              type="button"
              onClick={downloadImage}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-(--color-frame) text-(--color-charcoal) hover:border-(--color-bronze) hover:text-(--color-bronze) text-xs uppercase tracking-[0.15em]"
            >
              <Download className="w-4 h-4" />
              Télécharger la photo
            </button>
          )}

          <p className="mt-4 text-[11px] text-(--color-stone) leading-relaxed">
            <strong>Astuce :</strong> Facebook ne pré-remplit pas le texte du post (limitation
            Meta). Cliquez « Copier » d&apos;abord, puis « Facebook » et collez dans la zone de
            texte.
          </p>
        </section>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { ArrowLeft, Upload, Camera, MapPin, Calendar, Sparkles } from 'lucide-react'
import BulkUploadClient from './BulkUploadClient'

export const dynamic = 'force-dynamic'

export default function BulkUploadPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <Link href="/admin/boutique/photos" className="text-(--color-stone) hover:text-(--color-ink)">
          Photos
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Import en lot</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <Upload className="w-6 h-6 text-(--color-bronze)" />
          Import en lot
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Glissez plusieurs photos d&apos;un coup. Date et lieu sont extraits
          automatiquement des EXIF (JPEG). Utilisez le panneau « Défauts » pour
          appliquer une espèce/lieu commun à toutes les photos.
        </p>
      </header>

      {/* Wat het kan */}
      <ul className="grid sm:grid-cols-3 gap-3 text-xs">
        <li className="bg-(--color-paper) border border-(--color-frame) p-3 inline-flex items-start gap-2">
          <Calendar className="w-4 h-4 text-(--color-bronze) mt-0.5 shrink-0" />
          <span className="text-(--color-charcoal)">EXIF DateTimeOriginal → champ <code>taken_at</code></span>
        </li>
        <li className="bg-(--color-paper) border border-(--color-frame) p-3 inline-flex items-start gap-2">
          <MapPin className="w-4 h-4 text-(--color-bronze) mt-0.5 shrink-0" />
          <span className="text-(--color-charcoal)">EXIF GPS → coordonnées <em>(lat, lon)</em>, lieu à compléter à la main</span>
        </li>
        <li className="bg-(--color-paper) border border-(--color-frame) p-3 inline-flex items-start gap-2">
          <Camera className="w-4 h-4 text-(--color-bronze) mt-0.5 shrink-0" />
          <span className="text-(--color-charcoal)">Dimensions <em>(width × height)</em> mesurées avant upload</span>
        </li>
        <li className="bg-(--color-paper) border border-(--color-frame) p-3 inline-flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-(--color-bronze) mt-0.5 shrink-0" />
          <span className="text-(--color-charcoal)">Slug auto-généré depuis le nom de fichier (ou éditable)</span>
        </li>
      </ul>

      <BulkUploadClient />
    </main>
  )
}

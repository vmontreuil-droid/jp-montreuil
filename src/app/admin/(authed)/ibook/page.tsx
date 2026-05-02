import { getIbookConfig, ibookUrl } from '@/lib/ibook'
import IbookForm from './IbookForm'

export const dynamic = 'force-dynamic'

export default async function IbookAdminPage() {
  const cfg = await getIbookConfig()

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-2">
          Atelier Montreuil
        </p>
        <h1 className="text-4xl text-(--color-ink) font-[family-name:var(--font-display)]">
          Ibook
        </h1>
        <p className="mt-2 text-sm text-(--color-stone) max-w-2xl">
          Téléversez un PDF (catalogue, livre d&apos;artiste...) avec sa photo de couverture et un
          code QR. Le bloc apparaît sur la page <code>/a-propos</code> et un raccourci s&apos;ajoute
          dans la liste de contact.
        </p>
      </header>

      <IbookForm
        initial={{
          titleFr: cfg.titleFr,
          titleNl: cfg.titleNl,
          descriptionFr: cfg.descriptionFr,
          descriptionNl: cfg.descriptionNl,
          coverUrl: cfg.coverPath ? ibookUrl(cfg.coverPath) : '',
          qrUrl: cfg.qrPath ? ibookUrl(cfg.qrPath) : '',
          pdfUrl: cfg.pdfPath ? ibookUrl(cfg.pdfPath) : '',
        }}
      />
    </div>
  )
}

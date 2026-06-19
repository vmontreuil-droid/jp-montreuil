import { Loader2 } from 'lucide-react'

// Directe laad-indicator terwijl de album-pagina laadt — bezoeker ziet meteen
// dat er iets gebeurt i.p.v. een blanco scherm.
export default function AlbumLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-10 text-center">
      <Loader2 className="w-10 h-10 text-(--color-bronze) animate-spin" />
      <p className="text-sm uppercase tracking-[0.2em] text-(--color-stone)">
        Chargement de l’album… · Album wordt geladen…
      </p>
    </main>
  )
}

import { Loader2 } from 'lucide-react'

export default function PortailAlbumLoading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-10 text-center">
      <Loader2 className="w-10 h-10 text-(--color-bronze) animate-spin" />
      <p className="text-sm uppercase tracking-[0.2em] text-(--color-stone)">
        Chargement de l’album… · Album wordt geladen…
      </p>
    </main>
  )
}

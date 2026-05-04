import { Loader2 } from 'lucide-react'

export default function PortailLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-(--color-stone)">
      <Loader2 className="w-8 h-8 animate-spin text-(--color-bronze)" />
      <p className="text-xs uppercase tracking-[0.22em]">Atelier Montreuil</p>
    </div>
  )
}

import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-(--color-stone) mb-4">
          404
        </p>
        <h1 className="text-4xl text-(--color-ink) mb-4">Page introuvable</h1>
        <p className="text-(--color-charcoal) mb-8">
          La page que vous cherchez n&apos;existe pas.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 border border-(--color-ink) text-(--color-ink) hover:bg-(--color-ink) hover:text-(--color-canvas) transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}

import Link from 'next/link'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { unsubscribeByToken } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const sp = await searchParams
  const token = (sp.token ?? '').trim()
  const result = token ? await unsubscribeByToken(token) : { ok: false, email: null }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-(--color-paper) border border-(--color-frame) p-10 text-center">
        {result.ok ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto mb-4" />
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-3">
              Désinscription confirmée
            </h1>
            <p className="text-sm text-(--color-charcoal) leading-relaxed">
              {result.email
                ? <>L&apos;adresse <strong>{result.email}</strong> ne recevra plus de newsletter.</>
                : 'Vous ne recevrez plus de newsletter.'}
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-amber-700 mx-auto mb-4" />
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-(--color-ink) mb-3">
              Lien invalide
            </h1>
            <p className="text-sm text-(--color-charcoal) leading-relaxed">
              Ce lien de désinscription n&apos;est plus valide ou a déjà été utilisé. Si vous voulez vraiment vous désinscrire, contactez Jean-Pierre directement.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-(--color-bronze) text-white hover:bg-(--color-bronze-dark) text-xs uppercase tracking-[0.2em]"
        >
          Retour au site
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </main>
  )
}

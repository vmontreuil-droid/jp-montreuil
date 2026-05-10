import Link from 'next/link'
import { ArrowLeft, CreditCard, Check, AlertCircle, ExternalLink, Copy } from 'lucide-react'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function MollieSetupPage() {
  // Detecteer of MOLLIE_API_KEY gezet is. We doen het via een leichtgewicht
  // test-request (geen echte payment): de createMolliePayment helper geeft
  // null terug zonder key, en throwt anders. Voor de setup-page is een
  // simpele env-check via require voldoende.
  const hasKey = Boolean(process.env.MOLLIE_API_KEY)
  const keyKind = hasKey
    ? (process.env.MOLLIE_API_KEY ?? '').startsWith('test_')
      ? 'test'
      : (process.env.MOLLIE_API_KEY ?? '').startsWith('live_')
        ? 'live'
        : 'unknown'
    : null

  const h = await headers()
  const host = h.get('host') ?? 'jp.montreuil.be'
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const webhookUrl = `${proto}://${host}/api/shop/mollie-webhook`

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/boutique" className="text-(--color-stone) hover:text-(--color-ink) inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Boutique
        </Link>
        <span className="text-(--color-stone)/60">/</span>
        <span className="text-(--color-ink)">Paiements (Mollie)</span>
      </div>

      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-(--color-ink) inline-flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-(--color-bronze)" />
          Configuration Mollie
        </h1>
        <p className="text-sm text-(--color-charcoal) mt-1">
          Mollie est utilisé pour les paiements en ligne (Bancontact, carte, Apple Pay…).
          Sans clé, les commandes restent en statut « en attente » et vous devez les marquer
          payées manuellement.
        </p>
      </header>

      {/* Status */}
      <section className={`p-5 border ${hasKey ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          {hasKey ? <Check className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />}
          <div>
            <p className={`font-medium ${hasKey ? 'text-emerald-900' : 'text-amber-900'}`}>
              {hasKey ? 'MOLLIE_API_KEY configuré' : 'MOLLIE_API_KEY non configuré'}
            </p>
            <p className={`text-sm mt-1 ${hasKey ? 'text-emerald-800' : 'text-amber-800'}`}>
              {hasKey ? (
                <>
                  Mode <strong>{keyKind === 'live' ? 'LIVE (paiements réels)' : keyKind === 'test' ? 'TEST (paiements simulés)' : 'inconnu'}</strong>.
                  {keyKind === 'unknown' && ' Le préfixe doit être test_ ou live_.'}
                </>
              ) : (
                'Les commandes seront créées sans payment-link. Vous devrez marquer les commandes payées manuellement dans /admin/boutique/orders.'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Setup-stappen */}
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone)">Configuration en 4 étapes</h2>

        <Step
          n={1}
          title="Créer un compte Mollie"
          body={
            <>
              Inscrivez-vous gratuitement sur{' '}
              <a href="https://www.mollie.com" target="_blank" rel="noreferrer" className="text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-1">
                mollie.com <ExternalLink className="w-3 h-3" />
              </a>
              {' '}— activation prend ±24h après vérification d&apos;identité (KYC).
            </>
          }
        />

        <Step
          n={2}
          title="Récupérer la clé API"
          body={
            <>
              Dans le dashboard Mollie : <strong>Developers → API keys</strong>.
              Vous trouverez deux clés :
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><code className="text-xs bg-(--color-frame)/40 px-1.5 py-0.5">test_…</code> pour les tests</li>
                <li><code className="text-xs bg-(--color-frame)/40 px-1.5 py-0.5">live_…</code> pour les vrais paiements</li>
              </ul>
            </>
          }
        />

        <Step
          n={3}
          title="Coller la clé dans Vercel"
          body={
            <>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-(--color-bronze) hover:text-(--color-bronze-dark) inline-flex items-center gap-1">
                Vercel dashboard <ExternalLink className="w-3 h-3" />
              </a>
              {' '}→ projet jp-montreuil → <strong>Settings → Environment Variables</strong>.
              Ajoutez :
              <pre className="mt-2 bg-(--color-canvas) border border-(--color-frame) p-3 text-xs font-mono overflow-x-auto">
{`Name:  MOLLIE_API_KEY
Value: live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Scope: Production (+ Preview en option)`}
              </pre>
              <p className="mt-2 text-xs text-(--color-stone)">
                Après avoir sauvegardé : redéployez (Vercel → Deployments → ⋯ → Redeploy).
              </p>
            </>
          }
        />

        <Step
          n={4}
          title="Webhook URL chez Mollie"
          body={
            <>
              Dans <strong>Mollie → Developers → Webhook URLs</strong>, ajoutez l&apos;URL ci-dessous :
              <div className="mt-2 flex items-center gap-2 bg-(--color-canvas) border border-(--color-frame) p-3 font-mono text-xs">
                <code className="flex-1 break-all text-(--color-ink)">{webhookUrl}</code>
              </div>
              <p className="mt-2 text-xs text-(--color-stone)">
                Mollie POSTera ici à chaque changement de statut de paiement
                (paid / canceled / expired / failed).
              </p>
            </>
          }
        />
      </section>

      {/* Test-flow */}
      <section className="bg-(--color-paper) border border-(--color-frame) p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-(--color-stone) mb-3">Tester en mode test</h2>
        <ol className="text-sm text-(--color-charcoal) space-y-2 list-decimal pl-5">
          <li>
            Avec la clé <code className="text-xs bg-(--color-frame)/40 px-1.5 py-0.5">test_…</code> active,
            faites une commande sur <Link href="/shop/boutique" className="text-(--color-bronze) hover:underline">/shop/boutique</Link>.
          </li>
          <li>
            Sur la page Mollie, choisissez <strong>« iDEAL »</strong> ou <strong>« Bancontact »</strong> et confirmez.
          </li>
          <li>
            Retour sur jp-montreuil → l&apos;ordre passe automatiquement en statut <strong>paid</strong>
            (via le webhook) et un bon de production est créé pour l&apos;imprimeur par défaut.
          </li>
          <li>
            Vérifiez dans <Link href="/admin/boutique/orders" className="text-(--color-bronze) hover:underline">/admin/boutique/orders</Link>
            {' '}que la commande est bien marquée payée + dans <Link href="/admin/boutique/production" className="text-(--color-bronze) hover:underline">/admin/boutique/production</Link>
            {' '}qu&apos;un bon a été créé.
          </li>
        </ol>
      </section>

      <p className="text-xs text-(--color-stone) italic">
        ℹ Cette page lit uniquement la présence de la variable d&apos;env. Pour la sécurité,
        elle n&apos;affiche jamais la clé elle-même.
      </p>
    </main>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <article className="bg-(--color-paper) border border-(--color-frame) p-5 grid grid-cols-[40px_1fr] gap-4">
      <div>
        <span className="font-[family-name:var(--font-display)] text-3xl text-(--color-bronze)">
          {String(n).padStart(2, '0')}
        </span>
      </div>
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg text-(--color-ink) mb-2">{title}</h3>
        <div className="text-sm text-(--color-charcoal) leading-relaxed">{body}</div>
      </div>
    </article>
  )
}

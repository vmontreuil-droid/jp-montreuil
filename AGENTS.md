# JP Montreuil — Atelier Montreuil

Portfoliosite voor kunstenaar Jean-Pierre Montreuil. Migratie van WordPress (jp.montreuil.be op one.com) naar zelfgebouwde site met admin.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (auth + database + storage voor afbeeldingen)
- Resend (contact-formulier email)

## Belangrijke conventies (Next.js 16)
- Middleware heet `proxy.ts` (niet meer `middleware.ts`).
- Lees `node_modules/next/dist/docs/` voor up-to-date API's voor je code schrijft.
- Module path alias `@/*` -> `src/*`.

## i18n
- Tweetalig: FR (default), NL.
- **URL-prefix routing**: FR op root (`/`, `/contact`), NL onder `/nl/` (`/nl/`, `/nl/contact`).
- Reden: matcht bestaande WP-URL's, betere SEO, oude bookmarks blijven werken.
- Dictionaries in `src/i18n/{fr,nl}.ts`.

## Mappen
- `src/app/` — routes (App Router)
- `src/app/(site)/` — publieke routes (FR default)
- `src/app/nl/` — NL variant
- `src/app/admin/` — admin paneel (auth-protected, alleen rol `admin`)
- `src/components/` — gedeelde UI
- `src/i18n/` — vertalingen
- `src/lib/supabase/` — Supabase clients (server, browser, admin)
- `supabase/migrations/` — SQL schema
- `scripts/` — eenmalige scripts (scrape, seed)

## Domein
- Test op Vercel subdomein `*.vercel.app`
- Productie later: `jp.montreuil.be` (DNS verhuizen na go-live)

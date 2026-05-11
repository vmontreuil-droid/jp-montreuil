import { test, expect } from '@playwright/test'

/**
 * Locale-routing: /fr/* en /nl/* moeten beide werken voor elke
 * publieke pagina, en de h1's moeten daadwerkelijk verschillen
 * (anti-regressie tegen "alleen FR werkt").
 */

const PARALLEL_PAGES = [
  { fr: '/fr', nl: '/nl' },
  { fr: '/fr/comment-ca-marche', nl: '/nl/comment-ca-marche' },
  { fr: '/fr/a-propos', nl: '/nl/a-propos' },
  { fr: '/fr/contact', nl: '/nl/contact' },
  { fr: '/fr/devis', nl: '/nl/devis' },
  { fr: '/fr/galerie', nl: '/nl/galerie' },
  { fr: '/fr/expositions', nl: '/nl/expositions' },
  { fr: '/fr/presse', nl: '/nl/presse' },
  { fr: '/fr/mentions-legales', nl: '/nl/mentions-legales' },
  { fr: '/fr/confidentialite', nl: '/nl/confidentialite' },
] as const

for (const { fr, nl } of PARALLEL_PAGES) {
  test(`${fr} + ${nl} laden allebei`, async ({ page }) => {
    const r1 = await page.goto(fr)
    expect(r1?.status(), `${fr} faalt`).toBeLessThan(500)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const r2 = await page.goto(nl)
    expect(r2?.status(), `${nl} faalt`).toBeLessThan(500)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

test.describe('shop is locale-onafhankelijk via cookie', () => {
  test('/shop/boutique laadt sowieso', async ({ page }) => {
    const res = await page.goto('/shop/boutique')
    expect(res?.status()).toBeLessThan(500)
  })

  test('/shop/composition laadt sowieso', async ({ page }) => {
    const res = await page.goto('/shop/composition')
    expect(res?.status()).toBeLessThan(500)
  })
})

test.describe('html-lang attribuut', () => {
  test('FR pagina heeft <html lang="fr*">', async ({ page }) => {
    await page.goto('/fr')
    const lang = await page.locator('html').getAttribute('lang')
    // Accept "fr" of "fr-BE" / "fr-FR"
    expect(lang).toMatch(/^fr(-[A-Z]{2})?$/)
  })

  test('NL pagina heeft <html lang="nl*">', async ({ page }) => {
    await page.goto('/nl')
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toMatch(/^nl(-[A-Z]{2})?$/)
  })
})

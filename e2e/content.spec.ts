import { test, expect } from '@playwright/test'

/**
 * Content-pagina's: laden voor beide locales, h1 zichtbaar, geen
 * server-error. Geen interaction-tests — enkel rendering smoke.
 */

const PUBLIC_ROUTES = [
  '/',
  '/fr',
  '/nl',
  '/fr/comment-ca-marche',
  '/nl/comment-ca-marche',
  '/fr/a-propos',
  '/nl/a-propos',
  '/fr/contact',
  '/nl/contact',
  '/fr/devis',
  '/nl/devis',
  '/fr/galerie',
  '/nl/galerie',
  '/fr/expositions',
  '/nl/expositions',
  '/fr/presse',
  '/nl/presse',
  '/fr/mentions-legales',
  '/nl/mentions-legales',
  '/fr/confidentialite',
  '/nl/confidentialite',
  '/fr/social',
  '/nl/social',
  '/shop',
  '/shop/boutique',
  '/shop/panier',
  '/shop/favoris',
  '/shop/composition',
] as const

for (const route of PUBLIC_ROUTES) {
  test(`route loads: ${route}`, async ({ page }) => {
    const res = await page.goto(route)
    expect(res?.status(), `${route} should not error`).toBeLessThan(500)
    // Geen JavaScript-fouten in de console
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.waitForLoadState('domcontentloaded')
    expect(errors, `Console errors op ${route}`).toHaveLength(0)
  })
}

test.describe('comment ça marche — sections aanwezig', () => {
  test('FR alle hoofdsecties', async ({ page }) => {
    await page.goto('/fr/comment-ca-marche')
    await expect(page.getByRole('heading', { level: 1, name: /Comment ça marche/i })).toBeVisible()
    // Een paar key-section h2's die we hebben gemaakt
    await expect(page.getByRole('heading', { name: /quatre étapes/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /quatre matériaux/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /aperçu interactif/i })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /composez votre mur/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Recommandation par pièce/i })).toBeVisible()
  })

  test('NL alle hoofdsecties', async ({ page }) => {
    await page.goto('/nl/comment-ca-marche')
    await expect(page.getByRole('heading', { level: 1, name: /Hoe werkt het/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /vier stappen/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /vier materialen/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /interactieve preview/i })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /muur samen/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Aanbeveling per ruimte/i })).toBeVisible()
  })
})

test.describe('press-kit — alle sections', () => {
  test('FR sections aanwezig', async ({ page }) => {
    await page.goto('/fr/presse')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/journalistes|galeries|collectionneurs/i)
    await expect(page.getByRole('heading', { name: /Téléchargements/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Biographie/i })).toBeVisible()
    // Gebruik level 2 om matches met h1+h2+h3 (Pour galeries, Une demande presse) te beperken
    await expect(page.getByRole('heading', { level: 2, name: /galeries|wholesale|revendeurs/i }).first()).toBeVisible()
  })

  test('NL sections aanwezig', async ({ page }) => {
    await page.goto('/nl/presse')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/journalisten|galerijen|verzamelaars/i)
    await expect(page.getByRole('heading', { name: /Downloads/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Biografie/i })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /galerijen|wholesale|wederverkopers/i }).first()).toBeVisible()
  })

  test('contact-CTA mailto link werkt', async ({ page }) => {
    await page.goto('/fr/presse')
    const cta = page.getByRole('link', { name: /Écrire à Jean-Pierre/i })
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    expect(href).toContain('mailto:jp@montreuil.be')
  })
})

test.describe('contact form', () => {
  test('FR form-velden aanwezig', async ({ page }) => {
    await page.goto('/fr/contact')
    // Een contact-form moet minstens een email-input + textarea hebben
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('textarea').first()).toBeVisible()
  })
})

test.describe('galerie + album', () => {
  test('FR galerie toont categorie-cards', async ({ page }) => {
    await page.goto('/fr/galerie')
    // Mag leeg zijn (als nog geen categorieën), maar h1 moet er staan
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('NL galerie toont categorie-cards', async ({ page }) => {
    await page.goto('/nl/galerie')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

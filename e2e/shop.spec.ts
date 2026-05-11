import { test, expect } from '@playwright/test'

/**
 * Smoke-tests voor de shop. Doel: verifieer dat de hoofdroutes laden
 * zonder server-fouten + dat de configurator zichtbaar is. Volledige
 * happy-path tests volgen later.
 *
 * Run: npx playwright test e2e/shop.spec.ts
 */

test.describe('shop public pages', () => {
  test('homepage laadt', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBeLessThan(400)
    // Site title bevat Montreuil
    await expect(page).toHaveTitle(/Montreuil/i)
  })

  test('boutique-grid toont foto-cards', async ({ page }) => {
    const res = await page.goto('/shop/boutique')
    expect(res?.status()).toBeLessThan(400)
    // Wacht tot er minstens 1 link naar een fotodetail-pagina is
    await expect(page.locator('a[href^="/shop/boutique/photo/"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('compositie-builder is bereikbaar', async ({ page }) => {
    const res = await page.goto('/shop/composition')
    expect(res?.status()).toBeLessThan(400)
    // De 3 default slots moeten gerenderd zijn (lege of gevuld)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('panier-pagina werkt', async ({ page }) => {
    const res = await page.goto('/shop/panier')
    expect(res?.status()).toBeLessThan(400)
    // Lege cart toont "vide"-tekst (FR of NL)
    const text = await page.textContent('body')
    expect(text).toMatch(/vide|leeg|empty/i)
  })
})

test.describe('content pages', () => {
  test('comment ça marche laadt (FR)', async ({ page }) => {
    const res = await page.goto('/fr/comment-ca-marche')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('press-kit laadt (FR)', async ({ page }) => {
    const res = await page.goto('/fr/presse')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('OG-image route', () => {
  test('returnt 400 zonder slug', async ({ request }) => {
    const r = await request.get('/api/og/preview')
    expect(r.status()).toBe(400)
  })
})

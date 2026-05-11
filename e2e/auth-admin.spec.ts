import { test, expect } from '@playwright/test'

/**
 * Auth-redirects voor admin + portail. Geen echte login — alleen
 * verifiëren dat unauth users worden geredirecteerd naar de juiste
 * login-page.
 */

test.describe('admin redirect', () => {
  for (const route of [
    '/admin',
    '/admin/boutique',
    '/admin/boutique/orders',
    '/admin/boutique/photos',
    '/admin/boutique/customers',
    '/admin/clients',
    '/admin/commissions',
    '/admin/messages',
    '/admin/newsletter',
    '/admin/settings',
    '/admin/analytics',
    '/admin/exhibitions',
    '/admin/ibook',
    '/admin/about',
  ]) {
    test(`unauth user op ${route} → /admin/login`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(500)
      await page.waitForURL('**/admin/login**', { timeout: 5000 })
      expect(page.url()).toContain('/admin/login')
    })
  }
})

test.describe('portail redirect', () => {
  for (const route of [
    '/portail/compte',
    '/portail/commandes/TEST-REF',
    '/portail/commandes/TEST-REF/facture',
  ]) {
    test(`unauth user op ${route} → /portail/login`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(500)
      await page.waitForURL('**/portail/login**', { timeout: 5000 })
      expect(page.url()).toContain('/portail/login')
    })
  }
})

test.describe('login pages', () => {
  test('admin login form heeft email + password', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('portail login form heeft email + password', async ({ page }) => {
    await page.goto('/portail/login')
    // Footer-newsletter-input maakt ook input[type="email"], dus pak het login-form-veld
    await expect(page.locator('#email, form input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })
})

test.describe('not-found', () => {
  test('onbekende route geeft 404', async ({ page }) => {
    const res = await page.goto('/zzz-bestaat-niet-xyz-1234567890')
    expect(res?.status()).toBe(404)
  })

  test('onbekende foto-slug geeft 404', async ({ page }) => {
    const res = await page.goto('/shop/boutique/photo/zzz-niet-bestaande-slug-99999')
    expect(res?.status()).toBe(404)
  })
})

test.describe('api endpoints', () => {
  test('VIES check endpoint reageert op POST', async ({ request }) => {
    const r = await request.post('/api/shop/vies-check', {
      data: { vat_number: 'BE0123456789' },
    })
    // Mag 200 of 4xx zijn afhankelijk van validatie, maar nooit 5xx
    expect(r.status()).toBeLessThan(500)
  })

  test('mollie-webhook GET geeft 405 of 4xx', async ({ request }) => {
    const r = await request.get('/api/shop/mollie-webhook')
    // POST-only endpoint — GET zou 4xx moeten zijn
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })
})

import { test, expect } from '@playwright/test'

/**
 * /api/og/preview varianten. Edge-runtime returnt PNG, dus we
 * verifieren content-type en niet de pixel-inhoud.
 *
 * We delen één slug-fetch over alle tests via worker-scoped state
 * zodat we niet 50× /shop/boutique laden.
 */

let cachedSlug: string | null = null

test.beforeAll(async ({ browser }) => {
  if (cachedSlug) return
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/shop/boutique')
  const link = page.locator('a[href^="/shop/boutique/photo/"]').first()
  await link.waitFor({ timeout: 20_000 })
  const href = await link.getAttribute('href')
  cachedSlug = href?.replace('/shop/boutique/photo/', '') ?? null
  await ctx.close()
})

test.describe('OG-image edge route', () => {
  test('400 zonder slug of photoId', async ({ request }) => {
    const r = await request.get('/api/og/preview')
    expect(r.status()).toBe(400)
  })

  test('404 voor onbestaande slug', async ({ request }) => {
    const r = await request.get('/api/og/preview?slug=zzz-bestaat-niet-xyz-12345')
    expect(r.status()).toBe(404)
  })

  test('200 + image/png voor bestaande slug', async ({ request }) => {
    expect(cachedSlug, 'no slug fetched').toBeTruthy()
    const r = await request.get(`/api/og/preview?slug=${cachedSlug}`)
    expect(r.status()).toBe(200)
    expect(r.headers()['content-type']).toContain('image/png')
  })

  for (const material of ['fine_art', 'canvas', 'aluminum', 'plexi']) {
    test(`material variant: ${material}`, async ({ request }) => {
      expect(cachedSlug).toBeTruthy()
      const r = await request.get(`/api/og/preview?slug=${cachedSlug}&material=${material}`)
      expect(r.status()).toBe(200)
      expect(r.headers()['content-type']).toContain('image/png')
    })
  }

  for (const wall of ['beige', 'white', 'dark', 'room']) {
    test(`wall variant: ${wall}`, async ({ request }) => {
      expect(cachedSlug).toBeTruthy()
      const r = await request.get(`/api/og/preview?slug=${cachedSlug}&wall=${wall}`)
      expect(r.status()).toBe(200)
    })
  }

  for (const orientation of ['portrait', 'landscape']) {
    test(`orientation variant: ${orientation}`, async ({ request }) => {
      expect(cachedSlug).toBeTruthy()
      const r = await request.get(`/api/og/preview?slug=${cachedSlug}&orientation=${orientation}`)
      expect(r.status()).toBe(200)
    })
  }
})

import { test, expect, type Page } from '@playwright/test'

/**
 * Basis accessibility-checks. Geen volledige WCAG-audit (dat is een
 * apart hoofdstuk met axe-core), maar wel de must-haves: alt-text
 * op img's, h1 per pagina, taal-attribuut, geen zichtbare console-
 * errors.
 */

const PAGES = [
  '/',
  '/fr/comment-ca-marche',
  '/nl/comment-ca-marche',
  '/fr/presse',
  '/shop/boutique',
  '/shop/composition',
  '/shop/panier',
] as const

async function imagesWithoutAlt(page: Page): Promise<string[]> {
  return await page.locator('img:not([alt])').evaluateAll((els) =>
    els.map((el) => (el as HTMLImageElement).src),
  )
}

for (const route of PAGES) {
  test(`${route} — exact 1 h1`, async ({ page }) => {
    await page.goto(route)
    const h1Count = await page.locator('h1').count()
    expect(h1Count, `Verwacht exact 1 h1 op ${route}`).toBe(1)
  })

  test(`${route} — alle img's hebben alt`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('domcontentloaded')
    const missing = await imagesWithoutAlt(page)
    expect(missing, `${missing.length} img's zonder alt op ${route}`).toHaveLength(0)
  })

  test(`${route} — geen JS console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto(route)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { /* sommige routes hebben streams die nooit idle worden */ })
    // Filter:
    //  - dev-only HMR / 3rd-party noise (HMR, React DevTools, favicon)
    //  - 404 op resources (HEAD-checks voor AR-bestanden /shop/ar/*.glb,
    //    /shop/ar/*.usdz, expected-niet-aanwezig tot JP ze upload —
    //    knop wordt al gracefully verborgen)
    const real = errors.filter((e) =>
      !/Hot Module|HMR|Download the React DevTools|favicon/i.test(e) &&
      !/Failed to load resource.*404|Failed to load resource.*Not Found/i.test(e)
    )
    expect(real, `Console errors op ${route}: ${real.join(' | ')}`).toHaveLength(0)
  })

  test(`${route} — html heeft lang-attribuut`, async ({ page }) => {
    await page.goto(route)
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang, `${route} mist lang-attribuut`).toBeTruthy()
  })
}

test.describe('keyboard navigation', () => {
  test('TAB door homepage focus geeft visible focus', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    // Focused element moet bestaan
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeTruthy()
    expect(focused).not.toBe('BODY')
  })
})

test.describe('responsive smoke (mobile-chrome project)', () => {
  // Skip op desktop chromium — overflow-check is alleen relevant op mobile
  test.skip(({ isMobile }) => !isMobile, 'desktop project skipt mobile-overflow check')

  test('homepage past in viewport zonder horizontal scroll', async ({ page }) => {
    await page.goto('/')
    // Test echte horizontale scroll, niet enkel scrollWidth (die wordt
    // ook door translate-X off-screen elementen verhoogd, ook al heeft
    // body overflow-x: clip). Alleen falen als er ECHT gescrolld kan
    // worden naar rechts.
    const overflow = await page.evaluate(() => {
      window.scrollTo(99999, 0)
      const scrolled = window.scrollX > 0
      window.scrollTo(0, 0)
      return scrolled
    })
    expect(overflow, 'Pagina heeft horizontal overflow op deze viewport').toBeFalsy()
  })

  test('boutique past in viewport', async ({ page }) => {
    await page.goto('/shop/boutique')
    // Test echte horizontale scroll, niet enkel scrollWidth (die wordt
    // ook door translate-X off-screen elementen verhoogd, ook al heeft
    // body overflow-x: clip). Alleen falen als er ECHT gescrolld kan
    // worden naar rechts.
    const overflow = await page.evaluate(() => {
      window.scrollTo(99999, 0)
      const scrolled = window.scrollX > 0
      window.scrollTo(0, 0)
      return scrolled
    })
    expect(overflow).toBeFalsy()
  })
})

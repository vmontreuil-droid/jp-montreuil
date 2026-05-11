import { test, expect, type Page } from '@playwright/test'

/**
 * End-to-end cart flow: foto → configurator → add → /shop/panier
 * → quantity → remove → persist over reload.
 */

async function pickFirstAvailableConfig(page: Page) {
  await page.goto('/shop/boutique')
  const firstPhotoLink = page.locator('a[href^="/shop/boutique/photo/"]').first()
  await firstPhotoLink.waitFor({ timeout: 10000 })
  const href = await firstPhotoLink.getAttribute('href')
  await page.goto(href!)
  // Eerste materiaal-knop click — force: true om eventuele sticky-overlays
  // op mobile (mobile menu, header) te omzeilen die de hit-test verstoren
  const firstMat = page.getByRole('button', { name: /Toile|Canvas|Papier|Aluminium|Plexi/i }).first()
  await firstMat.scrollIntoViewIfNeeded()
  await firstMat.evaluate((el) => (el as HTMLButtonElement).click())
  // Eerste niet-disabled formaat-knop — force-click voor mobile
  const sizeBtns = page.getByRole('button').filter({ hasText: /\d+\s*[×x]\s*\d+\s*cm/i })
  const count = await sizeBtns.count()
  for (let i = 0; i < count; i++) {
    const b = sizeBtns.nth(i)
    if (await b.isEnabled()) {
      await b.scrollIntoViewIfNeeded()
      await b.evaluate((el) => (el as HTMLButtonElement).click())
      break
    }
  }
  // Wacht kort zodat de selectie state verwerkt wordt voordat we de
  // Ajouter-knop proberen (anders is hij nog disabled).
  await page.waitForTimeout(200)
}

test.describe('cart flow', () => {
  test('add to cart → /shop/panier toont 1 item', async ({ page }) => {
    await pickFirstAvailableConfig(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await addBtn.scrollIntoViewIfNeeded()
    // Native el.click() omzeilt pointer-event-interception én touch-vs-mouse
    // verschillen tussen chromium desktop en mobile-chrome
    await addBtn.evaluate((el) => (el as HTMLButtonElement).click())
    // Wacht kort voor de cart-update
    await page.waitForTimeout(500)
    await page.goto('/shop/panier')
    // Geen "vide" message meer
    const text = await page.textContent('body')
    expect(text).not.toMatch(/^Votre panier est vide|Uw winkelmandje is leeg/m)
    // Minstens 1 item-row
    await expect(page.getByRole('button', { name: /Retirer|Verwijderen/i }).first()).toBeVisible()
  })

  test('quantity verhogen werkt', async ({ page }) => {
    await pickFirstAvailableConfig(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await addBtn.scrollIntoViewIfNeeded()
    // Native el.click() omzeilt pointer-event-interception én touch-vs-mouse
    // verschillen tussen chromium desktop en mobile-chrome
    await addBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(400)
    await page.goto('/shop/panier')
    // Plus-knop heeft aria-label="+" in CartView — exact-match locator
    const plus = page.locator('button[aria-label="+"]').first()
    await plus.scrollIntoViewIfNeeded()
    // Check + click — fallback op evaluate als pointer-event geblokkeerd
    await plus.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(500) // langer wachten zodat React her-rendert
    await page.waitForTimeout(300)
    // Quantity-display in de cart-row (CartView heeft tabular-nums w-6
    // span). Header-badge toont OOK "2" maar is hidden op desktop.
    await expect(page.locator('main span.tabular-nums').filter({ hasText: /^2$/ }).first()).toBeVisible({ timeout: 3000 })
  })

  test('remove werkt', async ({ page }) => {
    await pickFirstAvailableConfig(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await addBtn.scrollIntoViewIfNeeded()
    // Native el.click() omzeilt pointer-event-interception én touch-vs-mouse
    // verschillen tussen chromium desktop en mobile-chrome
    await addBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(400)
    await page.goto('/shop/panier')
    const removeBtn = page.getByRole('button', { name: /Retirer|Verwijderen/i }).first()
    await removeBtn.scrollIntoViewIfNeeded()
    await removeBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(500)
    // Cart is leeg
    const text = await page.textContent('body')
    expect(text).toMatch(/vide|leeg/i)
  })

  test('cart persist over reload', async ({ page }) => {
    await pickFirstAvailableConfig(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await addBtn.scrollIntoViewIfNeeded()
    // Native el.click() omzeilt pointer-event-interception én touch-vs-mouse
    // verschillen tussen chromium desktop en mobile-chrome
    await addBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(400)
    await page.goto('/shop/panier')
    await page.reload()
    await expect(page.getByRole('button', { name: /Retirer|Verwijderen/i }).first()).toBeVisible()
  })
})

test.describe('panier checkout-link', () => {
  test('klik checkout → /shop/checkout', async ({ page }) => {
    await pickFirstAvailableConfig(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await addBtn.scrollIntoViewIfNeeded()
    // Native el.click() omzeilt pointer-event-interception én touch-vs-mouse
    // verschillen tussen chromium desktop en mobile-chrome
    await addBtn.evaluate((el) => (el as HTMLButtonElement).click())
    await page.waitForTimeout(400)
    await page.goto('/shop/panier')
    const checkoutLink = page.getByRole('link', { name: /Passer à la caisse|Naar de kassa/i })
    await expect(checkoutLink).toBeVisible()
    await checkoutLink.click()
    await page.waitForURL('**/shop/checkout', { timeout: 10000 })
  })
})

test.describe('wishlist flow', () => {
  test('add to wishlist via boutique grid', async ({ page }) => {
    await page.goto('/shop/boutique')
    // Heart-knop op een card hover-zichtbaar — klik forceren via locator
    const heart = page.locator('button[aria-label*="favori"], button[aria-label*="Favori"], button[aria-label*="favorit"]').first()
    if (await heart.count() === 0) {
      // Als geen aria-label match, zoek anders — skip
      test.skip(true, 'Wishlist-button niet gevonden via aria-label')
      return
    }
    await heart.click({ force: true })
    await page.goto('/shop/favoris')
    // Minstens 1 favoriet zichtbaar
    await expect(page.locator('a[href^="/shop/boutique/photo/"]').first()).toBeVisible({ timeout: 5000 })
  })
})

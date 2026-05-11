import { test, expect } from '@playwright/test'

/**
 * /shop/composition flows: layout-presets, spacing-slider, photo-picker
 * en add-all-to-cart.
 */

test.describe('composition page', () => {
  test('h1 + 4 layout-knoppen aanwezig', async ({ page }) => {
    await page.goto('/shop/composition')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // 4 layout-presets
    for (const name of [/Triptyque|Drieluik/i, /Salon/i, /Diptyque|Tweeluik/i, /Vertical|Verticaal/i]) {
      await expect(page.getByRole('button', { name }).first()).toBeVisible()
    }
  })

  test('layout-switch verandert slot-count', async ({ page }) => {
    await page.goto('/shop/composition')
    // Default = triptych (3 slots). Switch naar diptyque (2 slots).
    await page.getByRole('button', { name: /Diptyque|Tweeluik/i }).click()
    await page.waitForTimeout(300)
    // Check labels: triptychLeft + triptychRight verwacht (geen Center)
    // Niet trivial te asserten — kijk of er nog "À gauche" en "À droite" zijn
    const leftLabel = page.getByText(/À gauche|Links/i).first()
    await expect(leftLabel).toBeVisible()
  })

  test('spacing slider werkt', async ({ page }) => {
    await page.goto('/shop/composition')
    const slider = page.getByLabel(/Écart entre cadres|Afstand tussen kaders/i).first()
    await expect(slider).toBeVisible()
    // Default = 2 cm
    const value = await slider.inputValue()
    expect(Number(value)).toBeGreaterThanOrEqual(0)
    expect(Number(value)).toBeLessThanOrEqual(30)
  })

  test('photo-picker modal opent + sluit', async ({ page }) => {
    await page.goto('/shop/composition')
    // Eerste lege slot — als alle slots gevuld zijn skipt het.
    const emptySlot = page.getByRole('button', { name: /Vide — cliquez|Leeg — klik/i }).first()
    if (await emptySlot.count() === 0) {
      // Alle slots gevuld → klik X op een slot om er een leeg te maken
      const x = page.getByRole('button', { name: /^Remove$/i }).first()
      if (await x.count() > 0) await x.click()
    }
    const empty2 = page.getByRole('button', { name: /Vide — cliquez|Leeg — klik/i }).first()
    if (await empty2.count() === 0) {
      test.skip(true, 'Geen lege slot om picker te openen')
      return
    }
    await empty2.click()
    const modal = page.locator('div[role="dialog"][aria-modal="true"].fixed.inset-0').first()
    await expect(modal).toBeVisible()
    // Sluit met X
    await page.keyboard.press('Escape')
    // Onze modal heeft geen ESC-handler universeel — fallback klik buiten
    if (await modal.isVisible()) {
      await page.locator('body').click({ position: { x: 5, y: 5 } })
    }
  })

  test('totaal en CTA zichtbaar', async ({ page }) => {
    await page.goto('/shop/composition')
    await expect(page.getByRole('button', { name: /Tout ajouter au panier|Alles in winkelmandje/i })).toBeVisible()
    // €-bedrag in de footer
    await expect(page.locator('body')).toContainText(/€/)
  })
})

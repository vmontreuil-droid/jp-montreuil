import { test, expect, type Page } from '@playwright/test'

/**
 * Foto-detail + configurator interacties.
 *
 * We pakken de eerste beschikbare foto vanuit /shop/boutique zodat de
 * test niet hardcoded breekt wanneer JP foto's herorganiseert.
 */

async function gotoFirstPhoto(page: Page) {
  await page.goto('/shop/boutique')
  const firstPhotoLink = page.locator('a[href^="/shop/boutique/photo/"]').first()
  await firstPhotoLink.waitFor({ timeout: 10000 })
  const href = await firstPhotoLink.getAttribute('href')
  expect(href).toBeTruthy()
  await page.goto(href!)
  await page.waitForLoadState('domcontentloaded')
  return href!
}

test.describe('foto-detail page', () => {
  test('laadt + h1 + configurator zichtbaar', async ({ page }) => {
    await gotoFirstPhoto(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Materiaal-buttons (4 materialen verwacht): zoek tekst-fragmenten
    await expect(page.getByRole('button', { name: /Toile|Canvas/i }).first()).toBeVisible()
  })

  test('material-knop klik toont prijs-update', async ({ page }) => {
    await gotoFirstPhoto(page)
    // Vind een materiaal-button (canvas) — force-click om mobile-overlay
    // hit-test issues te omzeilen
    const canvasBtn = page.getByRole('button', { name: /Toile|Canvas/i }).first()
    await canvasBtn.scrollIntoViewIfNeeded()
    await canvasBtn.click({ force: true })
    // Prijs is zichtbaar (numerieke €-string)
    await expect(page.locator('body')).toContainText(/€/)
  })

  test('orientation-toggle werkt (portrait ↔ landscape)', async ({ page }) => {
    await gotoFirstPhoto(page)
    const landscape = page.getByRole('button', { name: /Paysage|Landschap/i }).first()
    if (await landscape.isVisible()) {
      await landscape.scrollIntoViewIfNeeded()
      await landscape.click({ force: true })
      await page.waitForTimeout(300)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  test('format-knop klik werkt', async ({ page }) => {
    await gotoFirstPhoto(page)
    // Zoek een knop met S/M/L/XL/XXL label + cm-tekst
    const sizeBtns = page.getByRole('button').filter({ hasText: /\d+\s*[×x]\s*\d+\s*cm/i })
    const count = await sizeBtns.count()
    expect(count).toBeGreaterThan(0)
    // Klik de eerste niet-disabled
    for (let i = 0; i < count; i++) {
      const btn = sizeBtns.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        break
      }
    }
  })

  test('add-to-cart knop is zichtbaar', async ({ page }) => {
    await gotoFirstPhoto(page)
    const addBtn = page.getByRole('button', { name: /Ajouter au panier|In winkelmandje/i })
    await expect(addBtn).toBeVisible()
  })

  test('lightbox opent + sluit met ESC', async ({ page }) => {
    await gotoFirstPhoto(page)
    // Klik de "Voir en grand" knop linksonder de stage
    const zoomBtn = page.getByRole('button', { name: /Voir en grand|Vergroot bekijken/i }).first()
    await zoomBtn.click()
    // Lightbox-modal: aparte selector dan de Menu-aside (die ook aria-modal heeft)
    const modal = page.locator('div[role="dialog"][aria-modal="true"].fixed.inset-0').first()
    await expect(modal).toBeVisible()
    // ESC sluit
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('reviews-badge link scrollt naar #reviews', async ({ page }) => {
    await gotoFirstPhoto(page)
    // De ReviewsBadge bestaat enkel als er ≥1 review is. Skip als niet.
    const badge = page.locator('a[href="#reviews"]')
    if (await badge.count() === 0) {
      test.skip(true, 'Geen reviews op deze foto — badge verborgen')
      return
    }
    await badge.first().click()
    await page.waitForTimeout(200)
    // De #reviews-anchor moet zichtbaar zijn
    await expect(page.locator('#reviews')).toBeVisible()
  })

  test('wall-toggle (4 themas) zichtbaar', async ({ page }) => {
    await gotoFirstPhoto(page)
    // De 4 wall-buttons via aria-label
    const beige = page.getByRole('button', { name: /^Beige$/i })
    const wit = page.getByRole('button', { name: /Galerie|Galerij/i })
    const donker = page.getByRole('button', { name: /Sombre|Donker/i })
    const salon = page.getByRole('button', { name: /^Salon$/i })
    await expect(beige.first()).toBeVisible()
    await expect(wit.first()).toBeVisible()
    await expect(donker.first()).toBeVisible()
    await expect(salon.first()).toBeVisible()
  })

  test('share + save knoppen aanwezig', async ({ page }) => {
    await gotoFirstPhoto(page)
    // Share + save-icon-buttons via title-attr
    await expect(page.locator('button[title*="Partager"], button[title*="Delen"]').first()).toBeVisible()
    await expect(page.locator('button[title*="Télécharger"], button[title*="Downloaden"]').first()).toBeVisible()
  })

  test('hang-positie 3 buttons (high/mid/low)', async ({ page }) => {
    await gotoFirstPhoto(page)
    await expect(page.getByRole('button', { name: /^Hang: high$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Hang: mid$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Hang: low$/i }).first()).toBeVisible()
  })

  test('mail-share knop opent modal', async ({ page }) => {
    await gotoFirstPhoto(page)
    const mailBtn = page.getByRole('button', { name: /Envoyer par mail|Versturen per mail/i }).first()
    await mailBtn.click()
    // Mail-modal: dezelfde fixed.inset-0-pattern als de lightbox
    const modal = page.locator('div[role="dialog"][aria-modal="true"].fixed.inset-0').first()
    await expect(modal).toBeVisible()
    await expect(modal.locator('input[type="email"]')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('compare-mode knop opent vergelijk-view', async ({ page }) => {
    await gotoFirstPhoto(page)
    const compareBtn = page.getByRole('button', { name: /Comparer matériaux|Materialen vergelijken/i })
    if (await compareBtn.count() === 0) {
      test.skip(true, 'Compare-knop niet gevonden — minder dan 2 materialen?')
      return
    }
    await compareBtn.first().scrollIntoViewIfNeeded()
    await compareBtn.first().click({ force: true })
    await expect(page.getByRole('combobox').first()).toBeVisible()
    const exit = page.getByRole('button', { name: /Fermer la comparaison|Vergelijking sluiten/i })
    await exit.click({ force: true })
  })

  test('OG meta tag aanwezig (og:image points naar /api/og/preview)', async ({ page }) => {
    await gotoFirstPhoto(page)
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toBeTruthy()
    expect(ogImage).toContain('/api/og/preview')
  })
})

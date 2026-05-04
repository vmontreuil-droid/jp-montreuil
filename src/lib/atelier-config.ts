/**
 * Statische bedrijfsgegevens van Atelier Montreuil.
 * Gebruikt voor de devis (IBAN, mededeling) en mailtjes.
 *
 * Wijzig hier wanneer JP een ander rekeningnummer gebruikt of de
 * standaard acompte-percentage aanpast — geen extra DB-tabel nodig.
 */
export const ATELIER = {
  name: 'Atelier Montreuil',
  ownerName: 'Jean-Pierre Montreuil',
  email: 'jp@montreuil.be',
  phone: '+32 475 61 68 38',
  address: 'Heuntjesstraat 6, 8570 Anzegem',
  iban: 'BE80 4621 1025 8177',
  ibanRaw: 'BE80462110258177',
  ibanHolder: 'Montreuil-Devogelaere J + M',
  bic: '',
  defaultAcomptePct: 50,
} as const

/** Format een bedrag in euro (komma als decimaalteken). */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Bouw een korte mededeling voor een overschrijving. Max 12 tekens vrij + `+++` */
export function buildPaymentReference(devisNumber: string): string {
  return `Devis ${devisNumber}`
}

/** Genereer een leesbaar devis-nummer (DV-2026-0001 stijl). */
export function generateDevisNumber(year: number, sequence: number): string {
  return `DV-${year}-${String(sequence).padStart(4, '0')}`
}

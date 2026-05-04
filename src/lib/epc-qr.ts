import QRCode from 'qrcode'

/**
 * Genereer een EPC069-12 SEPA Credit Transfer QR-payload.
 * Wordt door Belgische banking-apps (Bancontact, KBC, Belfius, ING…)
 * herkend en vult de overschrijving meteen in.
 *
 * Format spec: https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
 */
type EpcInput = {
  beneficiaryName: string
  iban: string
  amountEur: number
  /** Vrije mededeling (max 140 tekens) */
  communication: string
  /** Optioneel BIC */
  bic?: string
}

function sanitizeIban(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase()
}

function formatAmount(amount: number): string {
  return `EUR${amount.toFixed(2)}`
}

export function buildEpcPayload({
  beneficiaryName,
  iban,
  amountEur,
  communication,
  bic = '',
}: EpcInput): string {
  // Trim + truncate per spec
  const name = beneficiaryName.slice(0, 70).trim()
  const comm = communication.slice(0, 140).trim()

  const lines = [
    'BCD', // Service Tag
    '002', // Version
    '1', // Character set: 1 = UTF-8
    'SCT', // Identification: SEPA Credit Transfer
    bic.replace(/\s+/g, ''), // BIC (optional, can be empty for SEPA-zone)
    name,
    sanitizeIban(iban),
    formatAmount(amountEur),
    '', // Purpose code (optional)
    '', // Structured reference (optional)
    comm, // Unstructured reference / communication
    '', // Beneficiary information (optional)
  ]
  return lines.join('\n')
}

/**
 * Genereer een data URL (PNG, base64) van de EPC QR code.
 * Werkt in server-side actions / route handlers.
 */
export async function generateEpcQrDataUrl(input: EpcInput): Promise<string> {
  const payload = buildEpcPayload(input)
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#1c1916',
      light: '#ffffff',
    },
  })
}

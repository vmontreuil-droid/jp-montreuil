import QRCode from 'qrcode'

/**
 * Genereer een QR-code als data:image/png URL — server-side, zodat we
 * 'm rechtstreeks in `<img src=...>` kunnen plakken zonder client-side
 * lib of externe API.
 */
export async function generateQrDataUrl(text: string, size = 240): Promise<string> {
  if (!text) return ''
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1c1916',
        light: '#ffffff',
      },
    })
  } catch {
    return ''
  }
}

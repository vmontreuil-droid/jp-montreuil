/**
 * Minimale EXIF-reader zonder dependencies. Werkt enkel op JPEG/JFIF
 * (de meest courante format voor camera-RAW exports). HEIC/RAW worden
 * ondersteund door moderne browsers via FileReader maar de EXIF-locatie
 * verschilt — voor v1 trekken we daar niets uit en valt het terug op
 * de bestandsnaam-based metadata.
 *
 * Velden die we lezen:
 *   - DateTimeOriginal (tag 0x9003 in Exif IFD) → 'YYYY-MM-DD'
 *   - GPSLatitude + Ref + GPSLongitude + Ref → '50.831, 4.336' string
 *
 * Geport van allardphilippe.
 */

export type Exif = {
  takenAt?: string
  takenAtFull?: string
  gpsLat?: number
  gpsLon?: number
  gpsLabel?: string
}

export async function extractExifFromFile(file: File): Promise<Exif> {
  if (!file.type.startsWith('image/')) return {}
  const head = file.slice(0, 256 * 1024)
  const buf = await head.arrayBuffer()
  try {
    return parseJpegExif(new DataView(buf))
  } catch {
    return {}
  }
}

function parseJpegExif(view: DataView): Exif {
  if (view.getUint16(0) !== 0xffd8) return {}
  let offset = 2
  while (offset < view.byteLength - 4) {
    const marker = view.getUint16(offset)
    if (marker === 0xffe1) {
      const segLen = view.getUint16(offset + 2)
      if (
        view.getUint8(offset + 4) === 0x45 &&
        view.getUint8(offset + 5) === 0x78 &&
        view.getUint8(offset + 6) === 0x69 &&
        view.getUint8(offset + 7) === 0x66
      ) {
        return parseTiff(view, offset + 10)
      }
      offset += 2 + segLen
    } else if ((marker & 0xff00) === 0xff00) {
      const segLen = view.getUint16(offset + 2)
      offset += 2 + segLen
    } else {
      break
    }
  }
  return {}
}

function parseTiff(view: DataView, tiffStart: number): Exif {
  const byteOrder = view.getUint16(tiffStart)
  const little = byteOrder === 0x4949
  if (!little && byteOrder !== 0x4d4d) return {}

  const ifd0Off = view.getUint32(tiffStart + 4, little)
  const ifd0 = readIfd(view, tiffStart, tiffStart + ifd0Off, little)

  const out: Exif = {}

  const exifPtr = ifd0.get(0x8769)
  if (exifPtr && typeof exifPtr.value === 'number') {
    const exif = readIfd(view, tiffStart, tiffStart + exifPtr.value, little)
    const dto = exif.get(0x9003)
    if (dto && typeof dto.value === 'string') {
      const m = dto.value.match(/^(\d{4}):(\d{2}):(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/)
      if (m) {
        out.takenAt = `${m[1]}-${m[2]}-${m[3]}`
        out.takenAtFull = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
      }
    }
  }

  const gpsPtr = ifd0.get(0x8825)
  if (gpsPtr && typeof gpsPtr.value === 'number') {
    const gps = readIfd(view, tiffStart, tiffStart + gpsPtr.value, little)
    const latRef = gps.get(0x0001)?.value as string | undefined
    const lat = gps.get(0x0002)?.value as number[] | undefined
    const lonRef = gps.get(0x0003)?.value as string | undefined
    const lon = gps.get(0x0004)?.value as number[] | undefined
    if (lat && lat.length === 3 && lon && lon.length === 3) {
      const dec = (v: number[]) => v[0] + v[1] / 60 + v[2] / 3600
      let latVal = dec(lat)
      let lonVal = dec(lon)
      if ((latRef ?? '').trim().startsWith('S')) latVal = -latVal
      if ((lonRef ?? '').trim().startsWith('W')) lonVal = -lonVal
      out.gpsLat = latVal
      out.gpsLon = lonVal
      out.gpsLabel = `${latVal.toFixed(5)}, ${lonVal.toFixed(5)}`
    }
  }

  return out
}

type IfdEntry = { tag: number; type: number; count: number; value: number | string | number[] }

function readIfd(view: DataView, tiffStart: number, ifdStart: number, little: boolean): Map<number, IfdEntry> {
  const out = new Map<number, IfdEntry>()
  if (ifdStart + 2 > view.byteLength) return out
  const entries = view.getUint16(ifdStart, little)
  for (let i = 0; i < entries; i++) {
    const off = ifdStart + 2 + i * 12
    if (off + 12 > view.byteLength) break
    const tag = view.getUint16(off, little)
    const type = view.getUint16(off + 2, little)
    const count = view.getUint32(off + 4, little)
    const value = readIfdValue(view, tiffStart, off + 8, type, count, little)
    out.set(tag, { tag, type, count, value })
  }
  return out
}

function readIfdValue(
  view: DataView,
  tiffStart: number,
  valueOff: number,
  type: number,
  count: number,
  little: boolean,
): number | string | number[] {
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }
  const totalBytes = (sizes[type] ?? 1) * count
  const dataOff = totalBytes <= 4 ? valueOff : tiffStart + view.getUint32(valueOff, little)

  if (type === 2) {
    const bytes = []
    for (let k = 0; k < count - 1 && dataOff + k < view.byteLength; k++) {
      const b = view.getUint8(dataOff + k)
      if (b === 0) break
      bytes.push(b)
    }
    return String.fromCharCode(...bytes)
  }
  if (type === 3) {
    if (count === 1) return view.getUint16(dataOff, little)
    const arr: number[] = []
    for (let k = 0; k < count; k++) arr.push(view.getUint16(dataOff + k * 2, little))
    return arr
  }
  if (type === 4) {
    if (count === 1) return view.getUint32(dataOff, little)
    const arr: number[] = []
    for (let k = 0; k < count; k++) arr.push(view.getUint32(dataOff + k * 4, little))
    return arr
  }
  if (type === 5) {
    const arr: number[] = []
    for (let k = 0; k < count; k++) {
      const num = view.getUint32(dataOff + k * 8, little)
      const den = view.getUint32(dataOff + k * 8 + 4, little)
      arr.push(den === 0 ? 0 : num / den)
    }
    return arr
  }
  return 0
}

/**
 * Lees natuurlijke breedte/hoogte van een image-File. Werkt voor alle
 * browser-supported types (JPEG/PNG/WebP/AVIF/HEIC).
 */
export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ width: 0, height: 0 })
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0 })
    }
    img.src = url
  })
}

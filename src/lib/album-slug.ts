// Crockford-base32 zonder ambigue tekens (0/O, 1/I/L). Slug van 12 chars
// = 32^12 ≈ 2^60 → onraadbaar via brute force, kort genoeg om door te geven.

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const LENGTH = 12

export function generateAlbumSlug(): string {
  const arr = new Uint8Array(LENGTH)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < LENGTH; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[arr[i] % ALPHABET.length]
  return out
}

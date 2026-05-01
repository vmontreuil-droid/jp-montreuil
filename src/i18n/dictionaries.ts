import type { Locale } from './config'
import fr, { type Dictionary } from './fr'
import nl from './nl'

const dictionaries: Record<Locale, Dictionary> = { fr, nl }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

export type { Dictionary } from './fr'

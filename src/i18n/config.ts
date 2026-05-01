export const locales = ['fr', 'nl'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

export const localeLabels: Record<Locale, string> = {
  fr: 'FR',
  nl: 'NL',
}

export const htmlLang: Record<Locale, string> = {
  fr: 'fr-BE',
  nl: 'nl-BE',
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

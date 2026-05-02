import { setPortailLocale } from '@/app/portail/actions'
import type { Locale } from '@/i18n/config'

type Props = {
  altLocale: Locale
  altLabel: string
  ariaLabel: string
}

/**
 * FR/NL-knop voor /portail/*. Werkt via cookie ipv URL-prefix omdat de
 * portail geen /nl-route heeft. POST naar server action zet de cookie en
 * revalidate't de layout — pagina herlaadt automatisch in de andere taal.
 */
export default function PortailLocaleSwitch({ altLocale, altLabel, ariaLabel }: Props) {
  return (
    <form action={setPortailLocale.bind(null, altLocale)}>
      <button
        type="submit"
        aria-label={ariaLabel}
        className="inline-flex items-center justify-center text-xs uppercase tracking-[0.2em] text-(--color-stone) hover:text-(--color-ink) transition-colors border border-(--color-frame) px-3 h-[34px] rounded-sm cursor-pointer"
      >
        {altLabel}
      </button>
    </form>
  )
}

'use client'

import TranslateButton from './TranslateButton'

type Props = {
  getSource: () => string
  onTranslated: (translated: string) => void
}

/**
 * Toont twee vertaalknoppen ("→ FR" en "→ NL") naast elkaar.
 * Auto-detect van bron-taal — handig wanneer de UI niet op voorhand
 * weet welke taal het gevuld veld bevat.
 */
export default function BiTranslate({ getSource, onTranslated }: Props) {
  return (
    <div className="inline-flex gap-1">
      <TranslateButton getSource={getSource} to="fr" onTranslated={onTranslated} />
      <TranslateButton getSource={getSource} to="nl" onTranslated={onTranslated} />
    </div>
  )
}

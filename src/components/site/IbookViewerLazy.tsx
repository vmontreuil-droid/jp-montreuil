'use client'

import dynamic from 'next/dynamic'

/**
 * Wrapper rond `IbookViewer` die enkel client-side wordt geladen.
 * `react-pdf` evalueert op module-level `DOMMatrix` (browser-API), wat
 * SSR-render breekt met "DOMMatrix is not defined". Door dynamic +
 * `ssr: false` wordt de bundle pas in de browser geëvalueerd.
 *
 * Server components kunnen `IbookViewerLazy` direct importeren en
 * gebruiken zoals `IbookViewer`.
 */
const IbookViewerLazy = dynamic(() => import('./IbookViewer'), { ssr: false })

export default IbookViewerLazy

/**
 * Server-component die één of meerdere JSON-LD blokken inline op de page
 * zet. Geen `key`-issues want gebruik bij de array-variant indexes als key.
 *
 * Gebruik:
 *   <JsonLd data={personJsonLd({...})} />
 *   <JsonLd data={[personJsonLd({...}), localBusinessJsonLd({...})]} />
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data]
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify produceert geen </script> — geen XSS-risk
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  )
}

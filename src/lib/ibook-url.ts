/** Publieke URL voor een ibook-bestand uit de bucket. Pure helper —
 *  bewust gescheiden van ibook.ts (server-side fetchers) zodat client
 *  components 'm kunnen gebruiken zonder de server Supabase-client mee te
 *  bundlen. */
export function ibookUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return ''
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''
  return `${base}/storage/v1/object/public/ibook/${storagePath}`
}

/**
 * Error-log helpers — server-side logError (catch blocks van actions
 * + API routes) en /api/log-error endpoint voor client errors.
 *
 * Geport van allardphilippe — gebruikt service-role admin client zodat
 * we niet door RLS hoeven (anon insert is OK voor client-errors via
 * de aparte API-route).
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type ErrorSource = 'client' | 'server' | 'cron' | 'webhook'

export type LogErrorInput = {
  source: ErrorSource
  err: unknown
  url?: string | null
  userAgent?: string | null
  userEmail?: string | null
  context?: Record<string, unknown>
}

/**
 * Persist een error in public.error_log. Best-effort — als de log-call
 * zelf faalt, schrijven we naar console en gaan door (een log-error
 * mag nooit een primary action breken).
 */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const sb = createAdminClient()
    const message = formatMessage(input.err)
    const stack = formatStack(input.err)
    await sb.from('error_log').insert({
      source: input.source,
      message: message.slice(0, 500),
      stack: stack?.slice(0, 5000) ?? null,
      url: input.url?.slice(0, 500) ?? null,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      user_email: input.userEmail?.slice(0, 200) ?? null,
      context: input.context ? safeJson(input.context) : null,
    })
  } catch (logErr) {
    console.error('[error-log] insert failed:', logErr)
    console.error('[error-log] original error:', input.err)
  }
}

function formatMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err).slice(0, 200)
  } catch {
    return String(err)
  }
}

function formatStack(err: unknown): string | null {
  if (err instanceof Error && err.stack) return err.stack
  return null
}

function safeJson(obj: Record<string, unknown>): Record<string, unknown> {
  try {
    // Round-trip om non-serializable values eruit te halen
    return JSON.parse(JSON.stringify(obj))
  } catch {
    return { _unserializable: String(obj) }
  }
}

export type ErrorLogRow = {
  id: string
  source: ErrorSource
  message: string
  stack: string | null
  url: string | null
  user_agent: string | null
  user_email: string | null
  context: Record<string, unknown> | null
  occurred_at: string
  is_acknowledged: boolean
  acknowledged_at: string | null
  acknowledged_by: string | null
}

export async function listErrors(opts?: {
  acknowledged?: boolean
  limit?: number
}): Promise<ErrorLogRow[]> {
  const sb = createAdminClient()
  let q = sb.from('error_log').select('*').order('occurred_at', { ascending: false })
  if (opts?.acknowledged === true) q = q.eq('is_acknowledged', true)
  if (opts?.acknowledged === false) q = q.eq('is_acknowledged', false)
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ErrorLogRow[]
}

export async function acknowledgeError(id: string, userId?: string): Promise<void> {
  const sb = createAdminClient()
  await sb.from('error_log').update({
    is_acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: userId ?? null,
  }).eq('id', id)
}

export async function deleteErrorRow(id: string): Promise<void> {
  const sb = createAdminClient()
  await sb.from('error_log').delete().eq('id', id)
}

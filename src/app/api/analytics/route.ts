import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = new Set(['page_view', 'work_view', 'ibook_view', 'album_view'])

type Body = {
  event_type: string
  path: string
  referrer?: string | null
  session_id: string
  ua?: string
  work_id?: string | null
  category_slug?: string | null
  ibook_id?: string | null
  album_slug?: string | null
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const u = ua.toLowerCase()
  const device = /ipad|tablet/.test(u)
    ? 'tablet'
    : /mobile|iphone|android(?!.*tablet)/.test(u)
      ? 'mobile'
      : 'desktop'
  const browser = /edg\//.test(u)
    ? 'edge'
    : /chrome\//.test(u)
      ? 'chrome'
      : /safari\//.test(u) && !/chrome\//.test(u)
        ? 'safari'
        : /firefox\//.test(u)
          ? 'firefox'
          : 'other'
  const os = /windows/.test(u)
    ? 'windows'
    : /mac os|macintosh/.test(u)
      ? 'macos'
      : /iphone|ipad|ios/.test(u)
        ? 'ios'
        : /android/.test(u)
          ? 'android'
          : /linux/.test(u)
            ? 'linux'
            : 'other'
  return { device, browser, os }
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  if (!body.event_type || !ALLOWED_TYPES.has(body.event_type)) {
    return new NextResponse(null, { status: 400 })
  }
  if (!body.path || !body.session_id) {
    return new NextResponse(null, { status: 400 })
  }

  // Country uit Vercel header
  const country = request.headers.get('x-vercel-ip-country') || null
  const ua = body.ua || request.headers.get('user-agent') || ''
  const { device, browser, os } = parseUserAgent(ua)

  const admin = createAdminClient()
  await admin.from('analytics_events').insert({
    event_type: body.event_type,
    path: body.path.slice(0, 500),
    referrer: body.referrer ? body.referrer.slice(0, 500) : null,
    country,
    device,
    browser,
    os,
    session_id: body.session_id.slice(0, 100),
    work_id: body.work_id || null,
    category_slug: body.category_slug || null,
    ibook_id: body.ibook_id || null,
    album_slug: body.album_slug || null,
  })

  return new NextResponse(null, { status: 204 })
}

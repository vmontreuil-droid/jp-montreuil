import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = new Set([
  'page_view', 'work_view', 'ibook_view', 'album_view', 'shop_photo_view',
])

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
  shop_photo_id?: string | null
}

// Bot/headless filter — voorkomt dat e2e-tests, crawlers en monitoring-pings
// in de visitor-cijfers terechtkomen. We filteren defensief: bij twijfel wel
// loggen (bots zonder UA-tell-tale zijn zeldzaam genoeg dat de signal-noise
// ratio aanvaardbaar blijft).
const BOT_UA_PATTERN = /headlesschrome|playwright|puppeteer|phantomjs|selenium|webdriver|cypress|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|datadog|newrelic|bot\b|crawl|spider|slurp|baiduspider|bingpreview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|google-pagerendererror|googlebot|adsbot/i

function isBot(ua: string): boolean {
  if (!ua) return true // geen UA = waarschijnlijk bot/script
  return BOT_UA_PATTERN.test(ua)
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

  // Bot/headless filter — silent drop met 204 zodat clients niet retry'en
  if (isBot(ua)) {
    return new NextResponse(null, { status: 204 })
  }

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
    shop_photo_id: body.shop_photo_id || null,
  })

  return new NextResponse(null, { status: 204 })
}

import { NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured, messaging } from '@/lib/firebase'

/**
 * POST /api/push/send
 *
 * Sends an FCM push notification to either ALL farmers (topic) or a
 * specific list of farmerIds (token fanout).
 *
 * Auth: shared secret in `X-Admin-Secret` header, matching PUSH_ADMIN_SECRET
 *       env var. Mirrors the /api/telemetry pattern on the Node backend.
 *
 * Request body:
 *   {
 *     audience:   'broadcast' | 'farmers',
 *     farmerIds?: string[],   // required when audience='farmers'
 *     title:      string,
 *     body:       string,
 *     type?:      'generic' | 'whatsapp_notice' | 'payment_released' | 'rate_alert',
 *     data?:      Record<string, string>
 *   }
 *
 * Response:
 *   broadcast → { ok: true, messageId: "..." }
 *   farmers   → { ok: true, sent: N, failed: M, tokens: T, failures: [{ token, error }] }
 *
 * Channel routing: the Android app maps `data.type` → NotificationChannel
 * (see service/push/NotificationChannels.kt). Defaults to "generic" when
 * `type` is missing.
 */
type Audience = 'broadcast' | 'farmers'
type PushType = 'generic' | 'whatsapp_notice' | 'payment_released' | 'rate_alert'

interface SendRequest {
  audience: Audience
  farmerIds?: string[]
  title: string
  body: string
  type?: PushType
  data?: Record<string, string>
}

const TOPIC_ALL_FARMERS = 'all_farmers'

export async function POST(req: Request) {
  const secret = req.headers.get('x-admin-secret')
  if (!process.env.PUSH_ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'PUSH_ADMIN_SECRET env var not set on server' },
      { status: 500 }
    )
  }
  if (secret !== process.env.PUSH_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: 'Firebase not configured on server' },
      { status: 503 }
    )
  }

  let payload: SendRequest
  try {
    payload = (await req.json()) as SendRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { audience, title, body, type = 'generic', data = {}, farmerIds = [] } = payload
  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  }
  if (audience !== 'broadcast' && audience !== 'farmers') {
    return NextResponse.json(
      { error: "audience must be 'broadcast' or 'farmers'" },
      { status: 400 }
    )
  }
  if (audience === 'farmers' && farmerIds.length === 0) {
    return NextResponse.json(
      { error: 'farmerIds array required when audience=farmers' },
      { status: 400 }
    )
  }

  // Data payload — all values must be strings per FCM contract.
  const dataStrings: Record<string, string> = {
    type,
    title,
    body,
    ...data,
  }

  if (audience === 'broadcast') {
    try {
      const messageId = await messaging().send({
        topic: TOPIC_ALL_FARMERS,
        notification: { title, body },
        data: dataStrings,
        android: { priority: 'high' },
      })
      return NextResponse.json({ ok: true, messageId })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'send failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // audience === 'farmers' — look up every registered device token under
  // each farmer and fanout via sendEachForMulticast (caps at 500/call).
  const tokens = await collectTokensForFarmers(farmerIds)
  if (tokens.length === 0) {
    return NextResponse.json(
      { ok: true, sent: 0, failed: 0, tokens: 0, note: 'no registered devices for given farmerIds' },
    )
  }

  const failures: Array<{ token: string; error: string }> = []
  let sent = 0
  let failed = 0

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    const resp = await messaging().sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: dataStrings,
      android: { priority: 'high' },
    })
    sent += resp.successCount
    failed += resp.failureCount
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        failures.push({
          token: batch[idx].slice(0, 12) + '…', // redact full token in response
          error: r.error?.message ?? 'unknown error',
        })
      }
    })
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    tokens: tokens.length,
    failures: failures.slice(0, 20), // cap the body
  })
}

/**
 * Reads `farmers/{farmerId}/devices/*.token` for each farmerId and flattens
 * into a unique token list. Silently skips farmerIds with no devices.
 */
async function collectTokensForFarmers(farmerIds: string[]): Promise<string[]> {
  const db = firestore()
  const all = new Set<string>()
  await Promise.all(
    farmerIds.map(async (farmerId) => {
      const snap = await db
        .collection('farmers')
        .doc(farmerId)
        .collection('devices')
        .get()
      snap.docs.forEach((d) => {
        const token = d.data().token
        if (typeof token === 'string' && token.length > 0) all.add(token)
      })
    })
  )
  return Array.from(all)
}

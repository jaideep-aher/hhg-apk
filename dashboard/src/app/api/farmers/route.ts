import { NextRequest, NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

// Give the route plenty of time on Vercel/Railway. The old default of 10s
// was the real reason large farmer sets appeared truncated on the dashboard:
// Promise.all of N subcollection reads would get killed mid-flight.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * GET /api/farmers
 *
 * Query params:
 *   withPings=1       — include last 20 pings per farmer (slow; only used
 *                        when the caller explicitly wants full trails).
 *   pings=<n>         — override the per-farmer ping limit (default 20,
 *                        only honoured when withPings=1, max 100).
 *
 * Default (no params) returns only the summary document for each farmer,
 * which is O(1) Firestore reads per farmer and scales to thousands of
 * farmers without hitting serverless timeouts. Pings are fetched on demand
 * via /api/farmers/[id]/pings.
 */
export async function GET(req: NextRequest) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: 'Firebase not configured. Copy .env.local.example to .env.local and fill in credentials.' },
      { status: 503 }
    )
  }

  const started = Date.now()
  const url = new URL(req.url)
  const withPings = url.searchParams.get('withPings') === '1'
  const pingLimit = Math.max(1, Math.min(100, Number(url.searchParams.get('pings')) || 20))

  try {
    const db = firestore()
    const snap = await db.collection('farmers').get()

    // Shape summaries first — this is what the map actually needs to render.
    const summaries = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        lastLat: numberOrZero(data.lastLat),
        lastLng: numberOrZero(data.lastLng),
        lastAccuracyM: numberOrZero(data.lastAccuracyM, -1),
        lastSeenAt: isoFromTs(data.lastSeenAt),
        lastSource: stringOr(data.lastSource),
        appVersion: stringOr(data.appVersion),
        deviceModel: stringOr(data.deviceModel),
        deviceManufacturer: stringOr(data.deviceManufacturer),
        androidSdk: numberOrZero(data.androidSdk),
        pings: [] as PingDTO[],
      }
    })

    let pingFailures = 0
    if (withPings) {
      // allSettled — a single bad subcollection must not wipe out the whole
      // payload. Any failure is counted and returned in the metadata, rather
      // than surfaced as a 500, so the map still renders.
      const results = await Promise.allSettled(
        summaries.map((s) =>
          db
            .collection('farmers')
            .doc(s.id)
            .collection('pings')
            .orderBy('at', 'desc')
            .limit(pingLimit)
            .get()
        )
      )
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          summaries[i].pings = r.value.docs.map((p) => shapePing(p.data()))
        } else {
          pingFailures += 1
        }
      })
    }

    return NextResponse.json({
      farmers: summaries,
      count: summaries.length,
      withPings,
      pingFailures,
      fetchedAt: new Date().toISOString(),
      tookMs: Date.now() - started,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const hint = /DECODER routines|unsupported|PEM/i.test(message)
      ? ' — FIREBASE_PRIVATE_KEY looks malformed. Open /api/diag for diagnostics and re-paste per the deploy docs.'
      : ''
    return NextResponse.json(
      { error: message + hint, tookMs: Date.now() - started },
      { status: 500 }
    )
  }
}

type PingDTO = {
  lat: number
  lng: number
  accuracyM: number
  at: string | null
  source: string
  appVersion: string
}

function shapePing(pd: FirebaseFirestore.DocumentData): PingDTO {
  return {
    lat: numberOrZero(pd.lat),
    lng: numberOrZero(pd.lng),
    accuracyM: numberOrZero(pd.accuracyM, -1),
    at: isoFromTs(pd.at),
    source: stringOr(pd.source),
    appVersion: stringOr(pd.appVersion),
  }
}

function numberOrZero(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function stringOr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function isoFromTs(v: unknown): string | null {
  if (!v) return null
  const maybe = v as { toDate?: () => Date }
  if (typeof maybe.toDate === 'function') {
    try {
      return maybe.toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

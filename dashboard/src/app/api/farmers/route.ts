import { NextRequest, NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

/**
 * GET /api/farmers
 *
 * Returns one row per farmer in the top-level `farmers` collection, with the
 * summary fields the Android app upserts on every login/app-open ping.
 *
 * Design choices:
 *   - No per-farmer subcollection reads here. Previously we fanned out to
 *     `farmers/{id}/pings` inside a Promise.all over every farmer — an N+1
 *     that reliably timed out on Vercel's 10s serverless limit once the
 *     farmer count grew past ~30, producing the "dashboard only shows 10"
 *     symptom. Ping history is now fetched on-demand via
 *     `/api/farmers/[id]/pings` when a farmer is selected on the map.
 *   - `dynamic = 'force-dynamic'` + `revalidate = 0` + no-store cache
 *     headers prevent Next.js' default route caching from serving stale
 *     results after Firestore updates.
 *   - Optional name/phone enrichment from the Postgres backend is gated on
 *     BACKEND_URL being set; without it we gracefully fall back to id-only.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

type FarmerRow = {
  id: string
  lastLat: number
  lastLng: number
  lastAccuracyM: number
  lastSeenAt: string | null
  lastSource: string
  appVersion: string
  appVersionCode: number
  deviceModel: string
  deviceManufacturer: string
  androidSdk: number
  deviceCount: number
  name: string | null
  phone: string | null
  address: string | null
}

export async function GET(req: NextRequest) {
  if (!isFirebaseConfigured()) {
    return noStore(
      NextResponse.json(
        { error: 'Firebase not configured. Copy .env.local.example to .env.local and fill in credentials.' },
        { status: 503 }
      )
    )
  }

  const url = new URL(req.url)
  const enrichParam = url.searchParams.get('enrich')
  // Enrichment is opt-in per-request OR globally via env. Keeps cold-path
  // requests cheap when the backend isn't reachable.
  const wantEnrich =
    enrichParam === '1' ||
    enrichParam === 'true' ||
    process.env.ENABLE_NAME_ENRICHMENT === '1'

  try {
    const db = firestore()
    const snap = await db.collection('farmers').get()

    const farmers: FarmerRow[] = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        lastLat: num(d.lastLat, 0),
        lastLng: num(d.lastLng, 0),
        lastAccuracyM: num(d.lastAccuracyM, -1),
        lastSeenAt: toIso(d.lastSeenAt),
        lastSource: str(d.lastSource),
        appVersion: str(d.appVersion),
        appVersionCode: num(d.appVersionCode, 0),
        deviceModel: str(d.deviceModel),
        deviceManufacturer: str(d.deviceManufacturer),
        androidSdk: num(d.androidSdk, 0),
        deviceCount: 0, // populated from /devices subcollection aggregate if enrich
        // Pick up name fields if the mobile app ever starts writing them to
        // the summary doc; otherwise leave null and enrich from backend.
        name: str(d.farmername || d.name) || null,
        phone: str(d.mobilenumber || d.phone) || null,
        address: str(d.farmeraddress || d.address) || null,
      }
    })

    if (wantEnrich && process.env.BACKEND_URL) {
      await enrichFromBackend(farmers, process.env.BACKEND_URL)
    }

    return noStore(
      NextResponse.json({
        farmers,
        total: farmers.length,
        fetchedAt: new Date().toISOString(),
        enriched: wantEnrich && Boolean(process.env.BACKEND_URL),
      })
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const hint = /DECODER routines|unsupported|PEM/i.test(message)
      ? ' — FIREBASE_PRIVATE_KEY looks malformed. Open /api/diag for diagnostics and re-paste per the deploy docs.'
      : ''
    return noStore(NextResponse.json({ error: message + hint }, { status: 500 }))
  }
}

function num(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return fallback
}

function str(v: unknown): string {
  if (typeof v === 'string') return v
  return ''
}

// Firestore admin Timestamp has toDate(); plain objects don't.
function toIso(v: unknown): string | null {
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

function noStore<T extends NextResponse>(res: T): T {
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  return res
}

/**
 * Best-effort enrichment from the Postgres backend. Fetches each uid's farmer
 * record in parallel (capped concurrency) and attaches name/phone/address.
 * Any individual failure is swallowed — the dashboard still renders location
 * data without names if the backend is down.
 */
async function enrichFromBackend(farmers: FarmerRow[], backendUrl: string) {
  const base = backendUrl.replace(/\/+$/, '')
  const concurrency = 10
  let cursor = 0

  async function worker() {
    while (cursor < farmers.length) {
      const idx = cursor++
      const f = farmers[idx]
      // UIDs are 5-digit Aadhaar-last. Skip anything else (legacy/test docs).
      if (!/^\d{5}$/.test(f.id)) continue
      try {
        const r = await fetch(`${base}/api/farmer/${f.id}`, {
          // Short timeout via AbortController; backend is usually <1s.
          signal: AbortSignal.timeout(3000),
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (!r.ok) continue
        const body = (await r.json()) as {
          farmer?: { farmername?: string; mobilenumber?: string; farmeraddress?: string }
        }
        if (body.farmer) {
          f.name = body.farmer.farmername ?? f.name
          f.phone = body.farmer.mobilenumber ?? f.phone
          f.address = body.farmer.farmeraddress ?? f.address
        }
      } catch {
        // ignore — keep whatever we already had
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, farmers.length) }, worker)
  await Promise.all(workers)
}

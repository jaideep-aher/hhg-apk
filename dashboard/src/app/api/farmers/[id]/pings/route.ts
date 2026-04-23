import { NextRequest, NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

/**
 * GET /api/farmers/:id/pings?limit=N
 *
 * On-demand ping history for a single farmer. Split out from /api/farmers so
 * the list endpoint stays fast even with thousands of farmers — history is
 * only read when the user actually opens a specific farmer on the map.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 50

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseConfigured()) {
    return json({ error: 'Firebase not configured' }, 503)
  }

  const id = params.id?.trim()
  if (!id) return json({ error: 'missing id' }, 400)

  const url = new URL(req.url)
  const rawLimit = parseInt(url.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    const db = firestore()
    const snap = await db
      .collection('farmers')
      .doc(id)
      .collection('pings')
      .orderBy('at', 'desc')
      .limit(limit)
      .get()

    const pings = snap.docs.map((p) => {
      const d = p.data()
      const at = d.at as { toDate?: () => Date } | undefined
      return {
        lat: typeof d.lat === 'number' ? d.lat : 0,
        lng: typeof d.lng === 'number' ? d.lng : 0,
        accuracyM: typeof d.accuracyM === 'number' ? d.accuracyM : -1,
        at: at?.toDate?.()?.toISOString() ?? null,
        source: typeof d.source === 'string' ? d.source : '',
        appVersion: typeof d.appVersion === 'string' ? d.appVersion : '',
      }
    })

    return json({ farmerId: id, pings, count: pings.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

function json(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status })
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  return res
}

import { NextRequest, NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

/**
 * GET /api/farmers/:id/pings
 *
 * Lazy-loads the last N pings for a single farmer. Called from the map popup
 * when the user opens a farmer's details, so the main /api/farmers response
 * stays fast regardless of collection size.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: 'Firebase not configured.' }, { status: 503 })
  }

  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'Missing farmer id.' }, { status: 400 })
  }

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 50))

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
      const pd = p.data()
      const at = pd.at as { toDate?: () => Date } | undefined
      return {
        lat: typeof pd.lat === 'number' ? pd.lat : 0,
        lng: typeof pd.lng === 'number' ? pd.lng : 0,
        accuracyM: typeof pd.accuracyM === 'number' ? pd.accuracyM : -1,
        at: typeof at?.toDate === 'function' ? at.toDate().toISOString() : null,
        source: typeof pd.source === 'string' ? pd.source : '',
        appVersion: typeof pd.appVersion === 'string' ? pd.appVersion : '',
      }
    })

    return NextResponse.json({ id, pings, count: pings.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

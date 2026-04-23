import { NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

// Returns the last 30 pings for a single farmer. Called lazily when the user
// clicks a farmer dot on the map so the main /api/farmers list stays fast.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 })
  }

  try {
    const db = firestore()
    const pingsSnap = await db
      .collection('farmers')
      .doc(params.id)
      .collection('pings')
      .orderBy('at', 'desc')
      .limit(10)
      .get()

    const pings = pingsSnap.docs.map((p) => {
      const pd = p.data()
      return {
        lat: pd.lat ?? 0,
        lng: pd.lng ?? 0,
        accuracyM: pd.accuracyM ?? -1,
        at: pd.at?.toDate?.()?.toISOString() ?? null,
        source: pd.source ?? '',
        appVersion: pd.appVersion ?? '',
      }
    })

    return NextResponse.json({ pings })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

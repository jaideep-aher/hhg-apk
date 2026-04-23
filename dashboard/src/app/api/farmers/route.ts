import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

export const revalidate = 300

const getFarmersCached = unstable_cache(
  async () => {
    const db = firestore()
    const snap = await db.collection('farmers').orderBy('lastSeenAt', 'desc').get()

    const farmers = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch last 20 pings for this farmer
        const pingsSnap = await db
          .collection('farmers')
          .doc(doc.id)
          .collection('pings')
          .orderBy('at', 'desc')
          .limit(20)
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

        return {
          id: doc.id,
          lastLat: data.lastLat ?? 0,
          lastLng: data.lastLng ?? 0,
          lastAccuracyM: data.lastAccuracyM ?? -1,
          lastSeenAt: data.lastSeenAt?.toDate?.()?.toISOString() ?? null,
          lastSource: data.lastSource ?? '',
          appVersion: data.appVersion ?? '',
          deviceModel: data.deviceModel ?? '',
          deviceManufacturer: data.deviceManufacturer ?? '',
          androidSdk: data.androidSdk ?? 0,
          pings,
        }
      })
    )

    return farmers
  },
  ['farmers-api-v1'],
  { revalidate: 300 }
)

export async function GET() {
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: 'Firebase not configured. Copy .env.local.example to .env.local and fill in credentials.' },
      { status: 503 }
    )
  }

  try {
    const farmers = await getFarmersCached()

    return NextResponse.json({ farmers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    // Surface a hint when the usual private-key paste mistake bubbles up.
    const hint = /DECODER routines|unsupported|PEM/i.test(message)
      ? ' — FIREBASE_PRIVATE_KEY looks malformed. Open /api/diag for diagnostics and re-paste per the deploy docs.'
      : /UNAUTHENTICATED|invalid authentication credentials|access token/i.test(message)
        ? ' — Firebase credential was rejected by Google. Open /api/diag and verify FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY come from the same service-account JSON.'
        : ''
    return NextResponse.json({ error: message + hint }, { status: 500 })
  }
}

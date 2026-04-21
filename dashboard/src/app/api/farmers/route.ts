import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function db() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

export async function GET() {
  if (!process.env.FIREBASE_PROJECT_ID) {
    return NextResponse.json(
      { error: 'Firebase not configured. Copy .env.local.example to .env.local and fill in credentials.' },
      { status: 503 }
    )
  }

  try {
    const firestore = db()
    const snap = await firestore.collection('farmers').get()

    const farmers = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data()

        // Fetch last 20 pings for this farmer
        const pingsSnap = await firestore
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

    return NextResponse.json({ farmers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

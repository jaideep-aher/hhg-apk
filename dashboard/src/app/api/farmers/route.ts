import { NextResponse } from 'next/server'
import { firestore, isFirebaseConfigured } from '@/lib/firebase'

// Returns all farmer summary documents in one Firestore collection scan — no
// subcollection queries so this scales to any number of farmers without timing out.
// Pings / trail data are loaded on-demand via /api/farmers/[id].
export async function GET() {
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: 'Firebase not configured. Copy .env.local.example to .env.local and fill in credentials.' },
      { status: 503 }
    )
  }

  try {
    const db = firestore()
    const snap = await db.collection('farmers').get()

    const farmers = snap.docs.map((doc) => {
      const data = doc.data()
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
      }
    })

    return NextResponse.json({
      farmers,
      fetchedAt: new Date().toISOString(),
      total: farmers.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const hint = /DECODER routines|unsupported|PEM/i.test(message)
      ? ' — FIREBASE_PRIVATE_KEY looks malformed. Open /api/diag for diagnostics and re-paste per the deploy docs.'
      : ''
    return NextResponse.json({ error: message + hint }, { status: 500 })
  }
}

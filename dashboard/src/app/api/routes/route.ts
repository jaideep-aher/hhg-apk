import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeRoute(id: string, data: Record<string, any>) {
  return {
    id,
    name: data.name ?? 'Unnamed Route',
    color: data.color ?? '#3b82f6',
    vehicle: data.vehicle ?? '',
    waypoints: data.waypoints ?? [],
    active: data.active ?? true,
    createdAt:
      data.createdAt instanceof Object && 'toDate' in data.createdAt
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const db = firestore()
    const snap = await db
      .collection('vehicleRoutes')
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .get()
    const routes = snap.docs.map((doc) => serializeRoute(doc.id, doc.data()))
    return NextResponse.json({ routes })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, color, vehicle, waypoints, id } = body

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json({ error: 'Route needs at least 2 waypoints' }, { status: 400 })
    }

    const db = firestore()
    const now = new Date().toISOString()
    const data = {
      name: (name ?? '').trim() || 'Unnamed Route',
      color: color ?? '#3b82f6',
      vehicle: (vehicle ?? '').trim(),
      waypoints,
      active: true,
      updatedAt: now,
    }

    if (id) {
      await db.collection('vehicleRoutes').doc(id).set(data, { merge: true })
      return NextResponse.json({ id, ...data, createdAt: now })
    }

    const ref = await db.collection('vehicleRoutes').add({ ...data, createdAt: now })
    return NextResponse.json({ id: ref.id, ...data, createdAt: now })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

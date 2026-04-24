import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebase'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = firestore()
    await db.collection('vehicleRoutes').doc(params.id).update({ active: false })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

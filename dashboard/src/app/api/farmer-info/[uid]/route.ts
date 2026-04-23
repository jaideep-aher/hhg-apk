import { NextResponse } from 'next/server'

/**
 * GET /api/farmer-info/:uid
 *
 * Thin proxy to the Postgres backend's /api/farmer/:uid, exposing only the
 * profile fields (name, phone, address) — not the patti entries. The
 * dashboard uses this for on-demand name lookup when the user selects a
 * farmer, and for name-search autocomplete.
 *
 * Returns 501 when BACKEND_URL isn't configured so the client can fall back
 * to id-only display without retrying.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _req: Request,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid?.trim() ?? ''
  if (!/^\d{5}$/.test(uid)) {
    return json({ error: 'uid must be exactly 5 digits' }, 400)
  }

  const backend = process.env.BACKEND_URL?.replace(/\/+$/, '')
  if (!backend) {
    return json({ error: 'BACKEND_URL not configured', configured: false }, 501)
  }

  try {
    const r = await fetch(`${backend}/api/farmer/${uid}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (r.status === 404) return json({ error: 'not found' }, 404)
    if (!r.ok) return json({ error: `backend ${r.status}` }, 502)

    const body = (await r.json()) as {
      farmer?: {
        farmerid?: number
        uid?: string
        farmername?: string
        mobilenumber?: string | null
        farmeraddress?: string | null
        status?: string
      }
    }
    if (!body.farmer) return json({ error: 'not found' }, 404)

    return json({
      uid: body.farmer.uid ?? uid,
      name: body.farmer.farmername ?? null,
      phone: body.farmer.mobilenumber ?? null,
      address: body.farmer.farmeraddress ?? null,
      status: body.farmer.status ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: message }, 502)
  }
}

function json(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status })
  res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  return res
}

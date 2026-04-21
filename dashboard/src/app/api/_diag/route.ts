import { NextResponse } from 'next/server'
import { firebaseConfigDiagnostics, firestore } from '@/lib/firebase'

/**
 * GET /api/_diag
 *
 * Read-only diagnostics for the Firebase config on whatever host the
 * dashboard is deployed to. Never returns the private key itself — only
 * structural facts (length, line count, marker presence) so you can tell
 * whether a paste into Railway/Vercel's env UI got mangled.
 *
 * Also attempts a cheap Firestore read so network / permission issues
 * surface here instead of on the main page.
 */
export async function GET() {
  const diag = firebaseConfigDiagnostics()

  let firestoreCheck: { ok: true; farmerDocs: number } | { ok: false; error: string }
  try {
    const db = firestore()
    const snap = await db.collection('farmers').limit(1).get()
    firestoreCheck = { ok: true, farmerDocs: snap.size }
  } catch (err) {
    firestoreCheck = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  return NextResponse.json({
    env: diag,
    firestore: firestoreCheck,
    hints: buildHints(diag, firestoreCheck),
  })
}

function buildHints(
  diag: ReturnType<typeof firebaseConfigDiagnostics>,
  fs: { ok: true; farmerDocs: number } | { ok: false; error: string }
): string[] {
  const h: string[] = []
  if (!diag.projectIdSet) h.push('Set FIREBASE_PROJECT_ID.')
  if (!diag.clientEmailSet) h.push('Set FIREBASE_CLIENT_EMAIL.')
  if (diag.privateKeySource === 'none') {
    h.push('Neither FIREBASE_PRIVATE_KEY nor FIREBASE_PRIVATE_KEY_BASE64 is set.')
  } else {
    if (!diag.privateKeyHasBeginMarker) h.push("Private key is missing '-----BEGIN …-----' marker — likely truncated on paste.")
    if (!diag.privateKeyHasEndMarker) h.push("Private key is missing '-----END …-----' marker — likely truncated on paste.")
    if (diag.privateKeyLineCount < 10) h.push(`Private key has only ${diag.privateKeyLineCount} line(s); a real key has ~28. Newlines were probably stripped — try the FIREBASE_PRIVATE_KEY_BASE64 alternative.`)
  }
  if (!fs.ok && /DECODER|unsupported|PEM/i.test(fs.error)) {
    h.push('Firestore rejected the credential because the key did not parse. Re-paste the key, or use FIREBASE_PRIVATE_KEY_BASE64 (base64 of the PEM) to avoid newline issues entirely.')
  }
  if (!diag.pushAdminSecretSet) h.push('PUSH_ADMIN_SECRET not set — /api/push/send will refuse all requests.')
  return h
}

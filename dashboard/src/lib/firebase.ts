import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getMessaging, Messaging } from 'firebase-admin/messaging'

/**
 * Single shared Firebase Admin initialisation used by both:
 *   - /api/farmers  (reads Firestore farmers + pings)
 *   - /api/push/send (reads device tokens, sends FCM messages)
 *
 * Env vars (set in Vercel/Railway dashboard):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY          — Paste the JSON "private_key" value.
 *                                   Either real multi-line, or single-line
 *                                   with literal \n sequences — both work.
 *   FIREBASE_PRIVATE_KEY_BASE64   — (optional) Alternative: base64 of the
 *                                   raw PEM key. Use this when a host UI
 *                                   mangles quotes/newlines in the raw form.
 */

/**
 * Robustly coerces whatever a hosting UI stored back into a valid PEM key.
 * Handles:
 *   - real multi-line paste (leaves it as-is)
 *   - single-line paste with literal "\n" sequences
 *   - key wrapped in surrounding quotes (Vercel/Railway sometimes preserve them)
 *   - base64-encoded form via FIREBASE_PRIVATE_KEY_BASE64
 */
function resolvePrivateKey(): string | undefined {
  const b64 = process.env.FIREBASE_PRIVATE_KEY_BASE64
  if (b64 && b64.trim().length > 0) {
    try {
      return Buffer.from(b64.trim(), 'base64').toString('utf-8')
    } catch {
      return undefined
    }
  }

  const raw = process.env.FIREBASE_PRIVATE_KEY
  if (!raw) return undefined

  let k = raw
  // Strip a single layer of surrounding quotes if present.
  // Using [\s\S] instead of . + /s flag so the regex compiles on ES2017 TS targets.
  const quoted = /^["'][\s\S]*["']$/.test(k.trim())
  if (quoted) k = k.trim().slice(1, -1)

  // Convert literal \n → real newlines (idempotent when newlines are already real).
  k = k.replace(/\\n/g, '\n')

  // Trim any trailing whitespace that some UIs append on save.
  return k.trim() + '\n'
}

function ensureApp(): App {
  const apps = getApps()
  if (apps.length > 0) return apps[0]
  const privateKey = resolvePrivateKey()
  if (!privateKey) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY is not set (or FIREBASE_PRIVATE_KEY_BASE64 failed to decode).'
    )
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

export function isFirebaseConfigured(): boolean {
  if (!process.env.FIREBASE_PROJECT_ID) return false
  if (!process.env.FIREBASE_CLIENT_EMAIL) return false
  return Boolean(resolvePrivateKey())
}

/**
 * Diagnostics for the `/api/_diag` route — never reveals the key itself,
 * just structural facts that help the user figure out why a paste failed.
 */
export function firebaseConfigDiagnostics() {
  const pk = resolvePrivateKey()
  const rawPresent = Boolean(process.env.FIREBASE_PRIVATE_KEY)
  const b64Present = Boolean(process.env.FIREBASE_PRIVATE_KEY_BASE64)
  return {
    projectIdSet: Boolean(process.env.FIREBASE_PROJECT_ID),
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    clientEmailSet: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    privateKeySource: b64Present ? 'FIREBASE_PRIVATE_KEY_BASE64' : rawPresent ? 'FIREBASE_PRIVATE_KEY' : 'none',
    privateKeyLength: pk?.length ?? 0,
    privateKeyHasBeginMarker: Boolean(pk?.includes('-----BEGIN')),
    privateKeyHasEndMarker: Boolean(pk?.includes('-----END')),
    privateKeyLineCount: pk ? pk.split('\n').length : 0,
    pushAdminSecretSet: Boolean(process.env.PUSH_ADMIN_SECRET),
  }
}

export function firestore(): Firestore {
  ensureApp()
  return getFirestore()
}

export function messaging(): Messaging {
  ensureApp()
  return getMessaging()
}

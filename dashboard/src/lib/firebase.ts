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
 *   FIREBASE_PRIVATE_KEY   — Paste the JSON "private_key" value; literal \n
 *                            sequences are converted to real newlines below.
 */
function ensureApp(): App {
  const apps = getApps()
  if (apps.length > 0) return apps[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
}

export function firestore(): Firestore {
  ensureApp()
  return getFirestore()
}

export function messaging(): Messaging {
  ensureApp()
  return getMessaging()
}

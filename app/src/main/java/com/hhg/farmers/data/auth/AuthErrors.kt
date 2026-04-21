package com.hhg.farmers.data.auth

/**
 * Thrown by the auth / farmer-lookup stack when the server returns HTTP 429.
 *
 * The backend (see backend/src/services/loginRateLimit.js) caps how many
 * different farmer accounts — and how many failed UID attempts — can be
 * made from a single Android device per calendar day (IST). When that cap
 * is hit this exception carries everything the UI needs to show a proper
 * "try again tomorrow" message localized in Marathi / English.
 *
 * `retryAfterSeconds` comes from the `Retry-After` response header so the
 * UI can render "उद्या पुन्हा प्रयत्न करा" without guessing.
 */
class LoginRateLimitedException(
    val reason: Reason,
    val limitPerDay: Int,
    val retryAfterSeconds: Long
) : Exception("Login rate limit hit: $reason (limit=$limitPerDay)") {

    enum class Reason {
        /** Exceeded the daily cap on distinct successful farmer accounts from this device. */
        TOO_MANY_ACCOUNTS,
        /** Exceeded the daily cap on failed UID attempts (brute-force guard). */
        TOO_MANY_FAILED,
        /** Server returned 429 but didn't tell us why — treat as the account cap for UI purposes. */
        UNKNOWN
    }
}

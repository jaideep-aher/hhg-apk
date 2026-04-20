package com.hhg.farmers.data.auth

import kotlinx.coroutines.flow.Flow

/**
 * Authentication surface — intentionally generic so we can swap strategies without touching UI.
 *
 * Current strategy: [UidAuthRepository] (5-digit Aadhaar lookup, parity with the web).
 *
 * Future strategies (no UI rewrite needed, just a new impl + Hilt binding):
 *  - OtpAuthRepository     — phone + SMS OTP (Firebase Auth or MSG91)
 *  - PasswordAuthRepository — phone + password, for repeat users
 *
 * The ViewModel only depends on this interface; whichever impl is bound in
 * [com.hhg.farmers.di.RepositoryModule] is what gets used.
 */
interface AuthRepository {

    /**
     * Available authentication methods advertised to the UI.
     * Used by the home screen to pick between Aadhaar entry / phone+OTP / phone+password.
     */
    val supportedMethods: Set<AuthMethod>

    /** The currently logged-in session, or null if not logged in. */
    val currentSession: Flow<AuthSession?>

    /** Method 1 — Aadhaar last-5 lookup. Always supported. */
    suspend fun loginWithUid(uid: String): Result<AuthSession>

    /** Method 2 — request OTP to phone. Future. */
    suspend fun requestOtp(phoneE164: String): Result<OtpChallenge> =
        Result.failure(UnsupportedOperationException("OTP not yet implemented"))

    /** Method 2 — verify OTP. Future. */
    suspend fun verifyOtp(challenge: OtpChallenge, code: String): Result<AuthSession> =
        Result.failure(UnsupportedOperationException("OTP not yet implemented"))

    /** Method 3 — phone + password. Future. */
    suspend fun loginWithPassword(phoneE164: String, password: String): Result<AuthSession> =
        Result.failure(UnsupportedOperationException("Password login not yet implemented"))

    suspend fun logout()
}

enum class AuthMethod { UID, OTP, PASSWORD }

/**
 * Token-friendly session model. Today only [uid] is populated; in the OTP/password future,
 * [accessToken] + [refreshToken] carry real bearer tokens and the UI layer doesn't change.
 */
data class AuthSession(
    val uid: String,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val expiresAtEpochMs: Long? = null
)

data class OtpChallenge(val requestId: String, val phoneE164: String)

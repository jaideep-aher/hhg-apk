package com.hhg.farmers.data.auth

import com.hhg.farmers.data.repo.FarmerRepository
import com.hhg.farmers.data.session.SessionStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Current auth strategy: 5-digit Aadhaar lookup, matches web behavior.
 */
@Singleton
class UidAuthRepository @Inject constructor(
    private val farmerRepo: FarmerRepository,
    private val session: SessionStore
) : AuthRepository {

    override val supportedMethods: Set<AuthMethod> = setOf(AuthMethod.UID)

    override val currentSession: Flow<AuthSession?> =
        session.farmerId.map { uid -> uid?.let { AuthSession(uid = it) } }

    override suspend fun loginWithUid(uid: String): Result<AuthSession> = runCatching {
        require(uid.matches(Regex("^\\d{5}\$"))) { "Aadhaar must be exactly 5 digits" }
        val exists = farmerRepo.farmerExists(uid)
        if (!exists) error("Farmer not found")
        session.setFarmerId(uid)
        AuthSession(uid = uid)
    }

    override suspend fun logout() {
        session.clear()
    }
}

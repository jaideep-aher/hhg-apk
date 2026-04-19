package com.hhg.farmers.data.session

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "hhg_session")

/**
 * Persistent session store. Replaces the web's `localStorage` usage for `farmerId`.
 *
 * Scaling note: kept deliberately generic (key–value). When OTP/password login is added later,
 * we store additional keys (access_token, refresh_token, expiry) without changing callers.
 */
@Singleton
class SessionStore @Inject constructor(private val context: Context) {

    private object Keys {
        val FARMER_ID = stringPreferencesKey("farmer_id")
        val ACCESS_TOKEN = stringPreferencesKey("access_token")        // for future OTP/password login
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val TOKEN_EXPIRY = stringPreferencesKey("token_expiry")
        val ONBOARDED = booleanPreferencesKey("onboarded")
        val LOCATION_PERMISSION_ASKED = booleanPreferencesKey("location_permission_asked")
    }

    val farmerId: Flow<String?> = context.dataStore.data.map { it[Keys.FARMER_ID] }
    val accessToken: Flow<String?> = context.dataStore.data.map { it[Keys.ACCESS_TOKEN] }
    val onboarded: Flow<Boolean> = context.dataStore.data.map { it[Keys.ONBOARDED] ?: false }
    val locationPermissionAsked: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.LOCATION_PERMISSION_ASKED] ?: false }

    suspend fun setFarmerId(uid: String) {
        context.dataStore.edit { it[Keys.FARMER_ID] = uid }
    }

    suspend fun setTokens(access: String?, refresh: String? = null, expiry: String? = null) {
        context.dataStore.edit {
            if (access == null) it.remove(Keys.ACCESS_TOKEN) else it[Keys.ACCESS_TOKEN] = access
            if (refresh == null) it.remove(Keys.REFRESH_TOKEN) else it[Keys.REFRESH_TOKEN] = refresh
            if (expiry == null) it.remove(Keys.TOKEN_EXPIRY) else it[Keys.TOKEN_EXPIRY] = expiry
        }
    }

    suspend fun setOnboarded() {
        context.dataStore.edit { it[Keys.ONBOARDED] = true }
    }

    suspend fun setLocationPermissionAsked() {
        context.dataStore.edit { it[Keys.LOCATION_PERMISSION_ASKED] = true }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}

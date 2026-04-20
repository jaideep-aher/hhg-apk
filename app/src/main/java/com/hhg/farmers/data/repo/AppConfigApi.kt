package com.hhg.farmers.data.repo

import com.hhg.farmers.data.model.AppConfig
import retrofit2.http.GET

/**
 * Retrofit interface for GET /api/config.
 *
 * Called on every app launch to decide whether the installed version is still supported.
 * Kept intentionally tiny so it can't fail for partial-JSON reasons — every field in
 * [AppConfig] has a default so Moshi produces a usable object even on an empty response.
 */
interface AppConfigApi {
    @GET("config")
    suspend fun getConfig(): AppConfig
}

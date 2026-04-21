package com.hhg.farmers.service.network

import com.hhg.farmers.service.deviceinfo.DeviceIdProvider
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Attaches the stable device identifier to every call on the main HHG
 * backend. Used server-side by `loginRateLimit.js` to enforce the
 * per-device daily caps on distinct farmer accounts and failed attempts.
 *
 * Header name matches what routes/farmer.js reads via req.get('X-Device-Id').
 *
 * Intentionally NOT installed on the weather Retrofit — Open-Meteo is a
 * third-party service and has no business seeing our device identifiers.
 */
@Singleton
class DeviceIdInterceptor @Inject constructor(
    private val deviceIdProvider: DeviceIdProvider
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        // If the caller already set the header (tests, debug tools), respect it.
        if (original.header(HEADER) != null) {
            return chain.proceed(original)
        }
        val id = runCatching { deviceIdProvider.deviceId() }.getOrNull()
        val request = if (id.isNullOrBlank()) {
            original
        } else {
            original.newBuilder().header(HEADER, id).build()
        }
        return chain.proceed(request)
    }

    private companion object {
        const val HEADER = "X-Device-Id"
    }
}

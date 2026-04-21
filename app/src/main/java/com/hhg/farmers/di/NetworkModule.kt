package com.hhg.farmers.di

import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.repo.AppConfigApi
import com.hhg.farmers.data.repo.FarmerApi
import com.hhg.farmers.service.network.DeviceIdInterceptor
import com.hhg.farmers.service.weather.WeatherService
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.io.IOException
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/**
 * Provides the OkHttpClient and Retrofit instances used across the app.
 *
 * Two separate Retrofit instances:
 *   - "main"    — HHG backend (api.hanumanksk.in) — Railway, points to AWS RDS PostgreSQL
 *   - "weather" — Open-Meteo (api.open-meteo.com) — completely free, no API key
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideOkHttp(): OkHttpClient =
        OkHttpClient.Builder()
            // Rural 2G/3G reality: EDGE handshakes alone can take 15-20s, and
            // cold Railway dynos return 502 for a few seconds. Generous
            // timeouts + bounded callTimeout prevent both spurious failures
            // and runaway in-flight requests hanging forever.
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .callTimeout(90, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            // Transient 5xx retry (Railway cold-start 502s, flaky cellular).
            // Only retries safe GET-like failures; POSTs pass through.
            .addInterceptor(TransientRetryInterceptor(maxRetries = 2))
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BASIC
                        }
                    )
                }
            }
            .build()

    /**
     * Retries transient 502/503/504 and IOException on GET requests. Keeps
     * the first response's body closed before re-dispatching so we don't
     * leak connections. Exponential backoff with jitter — 400ms, 1200ms.
     */
    private class TransientRetryInterceptor(private val maxRetries: Int) : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val req = chain.request()
            if (req.method != "GET") return chain.proceed(req)

            var lastError: IOException? = null
            var attempt = 0
            while (attempt <= maxRetries) {
                try {
                    val resp = chain.proceed(req)
                    val code = resp.code
                    if (code in 502..504 && attempt < maxRetries) {
                        resp.close()
                        Thread.sleep(backoffMs(attempt))
                        attempt++
                        continue
                    }
                    return resp
                } catch (e: IOException) {
                    lastError = e
                    if (attempt >= maxRetries) throw e
                    Thread.sleep(backoffMs(attempt))
                    attempt++
                }
            }
            throw lastError ?: IOException("retry budget exhausted")
        }

        private fun backoffMs(attempt: Int): Long =
            (400L * (1 shl attempt)) + (0L..200L).random()
    }

    @Provides @Singleton @Named("main")
    fun provideMainRetrofit(
        client: OkHttpClient,
        moshi: Moshi,
        deviceIdInterceptor: DeviceIdInterceptor
    ): Retrofit {
        // Attach the device-id header only to the main (HHG backend) client.
        // Weather reuses the base client so the identifier never goes to
        // Open-Meteo.
        val mainClient = client.newBuilder()
            .addInterceptor(deviceIdInterceptor)
            .build()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(mainClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
    }

    /** Open-Meteo base URL — free weather API, no key needed. */
    @Provides @Singleton @Named("weather")
    fun provideWeatherRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.open-meteo.com/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides @Singleton
    fun provideFarmerApi(@Named("main") retrofit: Retrofit): FarmerApi =
        retrofit.create(FarmerApi::class.java)

    @Provides @Singleton
    fun provideAppConfigApi(@Named("main") retrofit: Retrofit): AppConfigApi =
        retrofit.create(AppConfigApi::class.java)

    @Provides @Singleton
    fun provideWeatherService(@Named("weather") retrofit: Retrofit): WeatherService =
        retrofit.create(WeatherService::class.java)
}

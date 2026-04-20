package com.hhg.farmers.di

import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.repo.FarmerApi
import com.hhg.farmers.service.weather.WeatherService
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
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
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
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

    @Provides @Singleton @Named("main")
    fun provideMainRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

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
    fun provideWeatherService(@Named("weather") retrofit: Retrofit): WeatherService =
        retrofit.create(WeatherService::class.java)
}

package com.hhg.farmers.di

import android.content.Context
import androidx.room.Room
import com.hhg.farmers.service.offline.OfflineCache
import com.hhg.farmers.service.offline.OfflineCacheDb
import com.hhg.farmers.service.offline.OfflineCacheImpl
import com.hhg.farmers.service.telemetry.TelemetryDb
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    @Provides @Singleton
    fun provideTelemetryDb(@ApplicationContext context: Context): TelemetryDb =
        Room.databaseBuilder(context, TelemetryDb::class.java, TelemetryDb.NAME)
            .fallbackToDestructiveMigration()
            .build()

    @Provides @Singleton
    fun provideOfflineCacheDb(@ApplicationContext context: Context): OfflineCacheDb =
        Room.databaseBuilder(context, OfflineCacheDb::class.java, OfflineCacheDb.NAME)
            .fallbackToDestructiveMigration()
            .build()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class CacheBindings {
    @Binds @Singleton abstract fun bindOfflineCache(impl: OfflineCacheImpl): OfflineCache
}

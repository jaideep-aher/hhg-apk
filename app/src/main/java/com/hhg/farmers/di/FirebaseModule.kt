package com.hhg.farmers.di

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.MemoryCacheSettings
import com.google.firebase.firestore.PersistentCacheSettings
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Provides Firebase singletons used for:
 *   - Farmer geo-location writes (Firestore)
 *   - Event stream / funnels (Analytics)
 *
 * All three are no-ops until `google-services.json` is present + Firebase plugin
 * applied (see `app/build.gradle.kts`). In debug builds we still provide real
 * instances so you can use Firebase DebugView.
 */
@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

    /**
     * Firestore with offline persistence enabled. Writes queue when offline and
     * flush when the device reconnects — critical for farmers on 2G/3G where
     * the first GPS fix may complete before the network handshake.
     */
    @Provides @Singleton
    fun provideFirestore(@ApplicationContext ctx: Context): FirebaseFirestore {
        // Defensive: FirebaseApp auto-initializes from google-services.json,
        // but on a fresh clone without the file we'd crash at first access.
        // Returning a no-op in that case would defeat the purpose, so we let
        // it throw and rely on the build-time guard in app/build.gradle.kts.
        FirebaseApp.initializeApp(ctx)
        return FirebaseFirestore.getInstance().apply {
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(
                    PersistentCacheSettings.newBuilder()
                        // 100MB is the default; farmers won't come close.
                        .build()
                )
                .build()
        }
    }

    @Provides @Singleton
    fun provideFirebaseAnalytics(@ApplicationContext ctx: Context): FirebaseAnalytics =
        FirebaseAnalytics.getInstance(ctx)
}

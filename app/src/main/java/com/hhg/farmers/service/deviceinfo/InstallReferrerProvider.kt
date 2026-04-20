package com.hhg.farmers.service.deviceinfo

import android.content.Context
import android.util.Log
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * Fetches the install referrer once via the Play Install Referrer API.
 * Tells us how a user got the app — organic search, campaign URL, or another app deep-link.
 */
@Singleton
class InstallReferrerProvider @Inject constructor(@ApplicationContext private val context: Context) {

    suspend fun fetch(): InstallReferrerInfo? = suspendCancellableCoroutine { cont ->
        val client = InstallReferrerClient.newBuilder(context).build()
        client.startConnection(object : InstallReferrerStateListener {
            override fun onInstallReferrerSetupFinished(responseCode: Int) {
                val result = runCatching {
                    when (responseCode) {
                        InstallReferrerClient.InstallReferrerResponse.OK -> {
                            val r = client.installReferrer
                            InstallReferrerInfo(
                                referrerUrl = r.installReferrer,
                                installBeginEpochSec = r.installBeginTimestampSeconds,
                                referrerClickEpochSec = r.referrerClickTimestampSeconds
                            )
                        }
                        else -> null
                    }
                }.onFailure { Log.w("InstallReferrer", "fetch failed", it) }.getOrNull()
                runCatching { client.endConnection() }
                if (cont.isActive) cont.resume(result)
            }

            override fun onInstallReferrerServiceDisconnected() {
                // Best-effort — resume with null if already disconnected before we read.
                if (cont.isActive) cont.resume(null)
            }
        })

        cont.invokeOnCancellation { runCatching { client.endConnection() } }
    }
}

data class InstallReferrerInfo(
    val referrerUrl: String?,
    val installBeginEpochSec: Long,
    val referrerClickEpochSec: Long
)

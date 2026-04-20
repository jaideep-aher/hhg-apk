package com.hhg.farmers.service.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.core.content.getSystemService
import com.hhg.farmers.R
import retrofit2.HttpException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

/**
 * Single source of truth for surfacing network / backend errors to the user.
 *
 * Two hard requirements enforced here:
 *
 *  1. **Offline-aware copy** — when the phone has no internet connectivity, the UI
 *     should say so plainly in the farmer's language (e.g. "इंटरनेट कनेक्शन
 *     नाही") rather than show a cryptic "UnknownHostException..." crash blob.
 *
 *  2. **No internal URL / DB / host leakage** — raw exception messages from OkHttp,
 *     Retrofit, JDBC, etc. often contain our backend URLs
 *     (e.g. `api.hanumanksk.in`), Railway/Neon host names, or SQL state codes.
 *     Those must NEVER reach the UI. This mapper intentionally throws away
 *     `throwable.message` and returns a fixed localized string based only on the
 *     *type* of exception.
 *
 * Do NOT add a branch that forwards `throwable.message` or `throwable.toString()`
 * to the UI — that reintroduces the leak.
 */
object NetworkErrors {

    /** Quick check used for pre-flight offline banners before we even fire a request. */
    fun isOnline(context: Context): Boolean {
        val cm = context.getSystemService<ConnectivityManager>() ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    /**
     * Classify a thrown error into a short, localized user-facing message.
     *
     * Keep the mapping conservative: only well-known exception *types* are
     * promoted to a more specific message. Everything else falls through to the
     * generic "something went wrong" so we never accidentally leak details.
     */
    fun toUserMessage(context: Context, throwable: Throwable?): String {
        if (throwable == null) return context.getString(R.string.error_generic)

        // Check connectivity first: if the device is offline, "no internet" is a
        // more useful message than "unknown host" even if the raw exception is
        // something else (e.g. a cached DNS failure).
        if (!isOnline(context)) return context.getString(R.string.error_no_internet)

        return when (throwable) {
            is UnknownHostException,
            is ConnectException -> context.getString(R.string.error_no_internet)

            is SocketTimeoutException -> context.getString(R.string.error_timeout)

            is SSLException -> context.getString(R.string.error_secure_connection)

            is HttpException -> {
                val code = throwable.code()
                when {
                    code in 500..599 -> context.getString(R.string.error_server)
                    code == 404 -> context.getString(R.string.error_not_found)
                    code in 400..499 -> context.getString(R.string.error_request_failed)
                    else -> context.getString(R.string.error_generic)
                }
            }

            is IOException -> context.getString(R.string.error_no_internet)

            else -> context.getString(R.string.error_generic)
        }
    }
}

package com.hhg.farmers.ui.screens.web

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.hhg.farmers.R
import com.hhg.farmers.data.session.SessionStore
import com.hhg.farmers.service.network.NetworkErrors
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange500
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Kotlin-shell host for a single web page. This is the ONE screen that renders
 * almost all content in the app — see the architecture summary in [WebPaths].
 *
 * Responsibilities (intentionally thin — everything UI-heavy lives on the web):
 *
 *   1. Mount an Android [WebView] with JS + DOM storage enabled so React works.
 *   2. Persist the farmer's Aadhaar across sessions via a two-way bridge between
 *      the site's `localStorage.farmerId` and the native [SessionStore] — the
 *      user enters their ID exactly once, ever.
 *   3. Hand off non-http intents (tel:, mailto:, whatsapp://, intent://, upi://
 *      and `market://`) to the appropriate system app. Prevents our WebView
 *      from trying to render a Play-Store URL as HTML.
 *   4. Render a loading indicator while pages are fetching and an offline/error
 *      overlay with a Retry button when the network is gone. All error copy is
 *      pulled from [NetworkErrors] so we never leak the backend hostname.
 *   5. Let the system-back key do in-WebView back navigation before popping
 *      the native stack — same pattern as the Play Store app.
 *
 * Extensibility:
 *   - Adding a new drawer item is a 3-line change (WebPaths + Routes + drawer).
 *   - Swapping the base URL is a remote config flip (AppConfig.webBaseUrl).
 *   - New JS→native calls go on [HhgJsBridge]; native→JS goes via evaluateJavascript.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewScreen(
    title: String,
    url: String,
    sessionStore: SessionStore,
    onBack: () -> Unit,
    onMenu: (() -> Unit)? = null,
    /**
     * Notified whenever the web page commits to a `/farmers/{aadhaar}` URL
     * (either because the user just searched, or the site auto-redirected
     * from its homepage because its own localStorage still had a cached id).
     * The shell uses this to mirror the id into [SessionStore].
     */
    onFarmerIdDetected: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // Snapshot initial online state; we drop the offline overlay once the
    // page loads successfully, not purely based on connectivity flips.
    var isOnlineAtStart by remember { mutableStateOf(NetworkErrors.isOnline(context)) }
    var isLoading by remember { mutableStateOf(true) }
    var progress by remember { mutableStateOf(0) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    // Key we bump to force-recreate the WebView on Retry.
    var reloadKey by remember { mutableStateOf(0) }

    // Fresh lambda each recomposition, but AndroidView's factory captures a
    // single stable reference via rememberUpdatedState so we don't need to
    // recreate the WebView when onFarmerIdDetected changes identity.
    val onFarmerIdDetectedState by rememberUpdatedState(onFarmerIdDetected)

    // Holder so back navigation can delegate to the underlying WebView.
    val webViewRef = remember { arrayOf<WebView?>(null) }

    // Hardware/gesture back: prefer in-webview history before popping the
    // native back stack. Matches Chrome / Play Store behavior.
    BackHandler {
        val wv = webViewRef[0]
        if (wv != null && wv.canGoBack()) wv.goBack() else onBack()
    }

    Column(modifier = modifier.fillMaxSize()) {
        // The top bar shows EITHER the hamburger OR the back arrow — not both.
        // Root screens (HOME / MARKET_HUB / AI_TREND) pass [onMenu] so we render
        // the drawer icon. Detail screens (SEEDS / LOCAL_VYAPARI / ABOUT / remote
        // pages) pass no [onMenu], so we render the back arrow instead.
        // In-WebView history is still honored via the system BackHandler below,
        // regardless of which icon is visible here.
        val showMenu = onMenu != null
        AppTopBar(
            title = title,
            onBack = if (showMenu) null else {
                {
                    val wv = webViewRef[0]
                    if (wv != null && wv.canGoBack()) wv.goBack() else onBack()
                }
            },
            onMenuClick = onMenu
        )

        if (isLoading && progress in 1..99) {
            LinearProgressIndicator(
                progress = { progress / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = HhgOrange500
            )
        }

        Box(modifier = Modifier.fillMaxSize()) {
            if (errorMessage == null) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            overScrollMode = WebView.OVER_SCROLL_NEVER

                            settings.apply {
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                // Cache aggressively — the site is mostly
                                // static shell + dynamic JSON fetches, so
                                // default caching gives us near-instant
                                // returns to already-visited pages.
                                cacheMode = WebSettings.LOAD_DEFAULT
                                loadsImagesAutomatically = true
                                useWideViewPort = true
                                loadWithOverviewMode = true
                                // Allow geolocation (the site asks the browser
                                // for the farmer's GPS for weather).
                                setGeolocationEnabled(true)
                                // A recognizable UA with a +hhg-android tag so
                                // the website can opt into app-only tweaks
                                // (e.g. hide the "Download our app" banner).
                                userAgentString = userAgentString + " hhg-android/8"
                                // Tablet / large-display safety: don't lie
                                // about the viewport width.
                                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                            }

                            // Cookies persist across sessions so if the site
                            // ever switches to an OTP/session-cookie auth, it
                            // Just Works from the user's perspective. Capture
                            // the WebView ref into a local so
                            // setAcceptThirdPartyCookies(webView, …) gets the
                            // right `this` — inside CookieManager's apply block
                            // `this` refers to the CookieManager.
                            val webViewInstance = this
                            CookieManager.getInstance().apply {
                                setAcceptCookie(true)
                                setAcceptThirdPartyCookies(webViewInstance, true)
                            }

                            // Register the JS bridge under a stable name. The
                            // injected bridge script (below) calls into it.
                            addJavascriptInterface(
                                HhgJsBridge(
                                    onFarmerId = { id ->
                                        if (id.isNotBlank()) onFarmerIdDetectedState(id)
                                    }
                                ),
                                "HHGAndroid"
                            )

                            webViewClient = HhgWebViewClient(
                                onPageStarted = {
                                    isLoading = true
                                    errorMessage = null
                                },
                                onPageFinished = { finishedUrl ->
                                    isLoading = false
                                    progress = 100
                                    // Inject the two-way farmerId bridge.
                                    this.evaluateJavascript(farmerIdBridgeScript(), null)
                                    // Scan the URL itself for /farmers/{id}
                                    // — belt-and-braces in case the site
                                    // hadn't yet set localStorage by the time
                                    // the bridge script fired.
                                    extractFarmerIdFromUrl(finishedUrl)?.let { id ->
                                        onFarmerIdDetectedState(id)
                                    }
                                },
                                onReceivedError = { errorCode ->
                                    isLoading = false
                                    // Map the WebView error to a localized
                                    // message. Everything routed through
                                    // string resources so it's Marathi by
                                    // default with English/Hindi fallbacks.
                                    // CRUCIAL: we *never* hand the raw
                                    // description (which contains our host)
                                    // to the UI.
                                    errorMessage = webViewErrorMessage(context, errorCode)
                                },
                                onExternalIntent = { intentUri ->
                                    runCatching {
                                        context.startActivity(
                                            Intent(Intent.ACTION_VIEW, intentUri)
                                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        )
                                    }
                                }
                            )

                            webChromeClient = object : android.webkit.WebChromeClient() {
                                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                    progress = newProgress
                                }
                            }

                            // Pre-seed the site's localStorage with the cached
                            // farmerId so its homepage auto-redirects to
                            // /farmers/{id} without another round trip.
                            scope.launch {
                                val cachedId = runCatching {
                                    sessionStore.farmerId.first()
                                }.getOrNull()
                                if (!cachedId.isNullOrBlank()) {
                                    evaluateJavascript(
                                        seedFarmerIdScript(cachedId),
                                        null
                                    )
                                }
                            }

                            webViewRef[0] = this
                            loadUrl(url)
                        }
                    },
                    update = { wv ->
                        // If reloadKey ticks, force a reload of the same URL.
                        // AndroidView's `update` block runs on every recomposition
                        // that observes `reloadKey`.
                        if (reloadKey > 0) {
                            reloadKey = 0
                            wv.loadUrl(url)
                        }
                    }
                )
            }

            // Full-screen initial loading state until the first page commit.
            if (isLoading && progress < 5 && errorMessage == null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = HhgOrange500)
                }
            }

            errorMessage?.let { msg ->
                WebViewErrorOverlay(
                    message = msg,
                    onRetry = {
                        errorMessage = null
                        isLoading = true
                        progress = 0
                        isOnlineAtStart = NetworkErrors.isOnline(context)
                        reloadKey++
                        webViewRef[0]?.loadUrl(url)
                    }
                )
            }
        }
    }

    // Detach the WebView cleanly on screen exit — prevents memory leaks
    // because Compose keeps the factory-produced view alive otherwise.
    DisposableEffect(Unit) {
        onDispose {
            webViewRef[0]?.apply {
                stopLoading()
                (parent as? ViewGroup)?.removeView(this)
                destroy()
            }
            webViewRef[0] = null
        }
    }

    // If we were offline at mount and a page never loads, surface an error
    // proactively so the user isn't just staring at a spinner forever.
    LaunchedEffect(Unit) {
        if (!isOnlineAtStart) {
            errorMessage = NetworkErrors.toUserMessage(context, null)
                .takeIf { !NetworkErrors.isOnline(context) }
                ?: context.getString(R.string.error_no_internet)
            isLoading = false
        }
    }
}

/* ───────────────────────── helpers & bridge types ────────────────────────── */

/**
 * JS→native surface area. Intentionally tiny: one method. If/when the web
 * team adds push-registration, "download-patti-as-pdf", or "open-native-
 * share-sheet", each goes on here as a new @JavascriptInterface method.
 */
private class HhgJsBridge(
    private val onFarmerId: (String) -> Unit
) {
    @JavascriptInterface
    fun onFarmerIdChanged(id: String) {
        // Called from UI thread of the WebView — hop back to the main
        // thread's compose scope via the lambda (which is expected to do
        // its own dispatching into viewModelScope / lifecycleScope).
        onFarmerId(id)
    }
}

/** Injected once per page load to sync the site's farmerId → native. */
private fun farmerIdBridgeScript(): String = """
    (function() {
        try {
            if (!window.__hhgBridgeInstalled__) {
                window.__hhgBridgeInstalled__ = true;
                var origSet = localStorage.setItem.bind(localStorage);
                localStorage.setItem = function(k, v) {
                    origSet(k, v);
                    if (k === 'farmerId' && window.HHGAndroid && window.HHGAndroid.onFarmerIdChanged) {
                        try { window.HHGAndroid.onFarmerIdChanged(String(v || '')); } catch (e) {}
                    }
                };
            }
            var existing = localStorage.getItem('farmerId') || '';
            if (existing && window.HHGAndroid && window.HHGAndroid.onFarmerIdChanged) {
                window.HHGAndroid.onFarmerIdChanged(String(existing));
            }
        } catch (e) { /* swallow — localStorage may be unavailable on some sub-frames */ }
    })();
""".trimIndent()

/**
 * Pre-seed the web's localStorage with [id] so its homepage's useEffect
 * auto-navigates to `/farmers/{id}` on cold start. Only called when the
 * native SessionStore already has a cached id.
 */
private fun seedFarmerIdScript(id: String): String {
    val safe = id.filter { it.isDigit() }  // avoid any JS-injection edge case
    return """
        (function() {
            try {
                if (!localStorage.getItem('farmerId')) {
                    localStorage.setItem('farmerId', '$safe');
                }
            } catch (e) {}
        })();
    """.trimIndent()
}

/** Pull `{id}` from a `/farmers/{id}` path in an absolute URL. */
private fun extractFarmerIdFromUrl(url: String?): String? {
    if (url == null) return null
    val parsed = runCatching { Uri.parse(url) }.getOrNull() ?: return null
    val path = parsed.path ?: return null
    return WebPaths.FARMER_PATH_REGEX.matchEntire(path)?.groupValues?.get(1)
}

/**
 * Our [WebViewClient]. Only job beyond defaults: route non-http intents to
 * native apps and map load errors to localized user-friendly copy.
 */
private class HhgWebViewClient(
    private val onPageStarted: () -> Unit,
    private val onPageFinished: (String?) -> Unit,
    private val onReceivedError: (Int) -> Unit,
    private val onExternalIntent: (Uri) -> Unit
) : WebViewClient() {

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        onPageStarted()
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        onPageFinished(url)
    }

    override fun shouldOverrideUrlLoading(
        view: WebView?,
        request: WebResourceRequest?
    ): Boolean {
        val uri = request?.url ?: return false
        val scheme = uri.scheme?.lowercase() ?: return false

        return when (scheme) {
            // Web traffic: let the WebView handle it.
            "http", "https", "about", "file" -> false

            // Everything else (tel:, mailto:, whatsapp://, upi://, intent://,
            // market:// etc.) gets handed to the OS. Prevents "net::ERR_UNKNOWN_
            // URL_SCHEME" errors when the site uses a deep link.
            else -> {
                onExternalIntent(uri)
                true
            }
        }
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        // Only surface a full-screen error if the MAIN frame failed to load.
        // Subresource failures (an analytics beacon, a missing image) should
        // not blank out the page.
        if (request?.isForMainFrame == true) {
            onReceivedError(error?.errorCode ?: ERROR_UNKNOWN)
        }
    }
}

/**
 * Map a WebView `errorCode` to a Marathi-first user-facing message. We
 * deliberately do NOT read the error description (which contains the URL
 * that failed) to guarantee no backend hostname ever reaches the UI.
 */
private fun webViewErrorMessage(context: android.content.Context, errorCode: Int): String {
    // If the device is offline in the first place, that's the most useful
    // message regardless of what WebView reports.
    if (!NetworkErrors.isOnline(context)) {
        return context.getString(R.string.error_no_internet)
    }

    return when (errorCode) {
        WebViewClient.ERROR_HOST_LOOKUP,
        WebViewClient.ERROR_CONNECT,
        WebViewClient.ERROR_PROXY_AUTHENTICATION,
        WebViewClient.ERROR_IO -> context.getString(R.string.error_no_internet)

        WebViewClient.ERROR_TIMEOUT -> context.getString(R.string.error_timeout)

        WebViewClient.ERROR_FAILED_SSL_HANDSHAKE,
        WebViewClient.ERROR_BAD_URL -> context.getString(R.string.error_secure_connection)

        WebViewClient.ERROR_FILE,
        WebViewClient.ERROR_FILE_NOT_FOUND -> context.getString(R.string.error_not_found)

        WebViewClient.ERROR_UNSUPPORTED_AUTH_SCHEME,
        WebViewClient.ERROR_AUTHENTICATION -> context.getString(R.string.error_request_failed)

        else -> context.getString(R.string.error_generic)
    }
}

private const val ERROR_UNKNOWN = -1

@Composable
private fun WebViewErrorOverlay(
    message: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = stringResource(R.string.error_connection_title),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = HhgOrange500,
                    contentColor = Color.White
                )
            ) {
                Text(stringResource(R.string.retry), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

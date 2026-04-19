package com.hhg.farmers

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.rememberNavController
import com.hhg.farmers.service.telemetry.TelemetryManager
import com.hhg.farmers.service.update.UpdateManager
import com.hhg.farmers.ui.navigation.AppNavHost
import com.hhg.farmers.ui.theme.HhgTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Single activity — Compose takes it from here.
 *
 * Responsibilities retained at the Activity level:
 *   - Apply edge-to-edge drawing + theme wrapper
 *   - Kick off the [UpdateManager] check on resume (required because the Play
 *     update flow needs a live Activity reference)
 *   - Hook a process-lifecycle observer to flag app backgrounding into telemetry
 *     (so `session_end` duration is accurate even when user swipes us away)
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var updateManager: UpdateManager
    @Inject lateinit var telemetry: TelemetryManager

    private val bgObserver = object : DefaultLifecycleObserver {
        override fun onStop(owner: LifecycleOwner) {
            telemetry.onAppBackground()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        ProcessLifecycleOwner.get().lifecycle.addObserver(bgObserver)
        setContent {
            HhgTheme {
                val navController = rememberNavController()
                Scaffold(modifier = Modifier.fillMaxSize()) { padding ->
                    AppNavHost(
                        navController = navController,
                        modifier = Modifier.padding(padding)
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Play In-App Updates — immediate flow forces the user off stale versions when the
        // backend's min-supported version code is bumped. Non-blocking otherwise.
        lifecycleScope.launch { updateManager.checkForUpdate(this@MainActivity) }
    }

    override fun onDestroy() {
        ProcessLifecycleOwner.get().lifecycle.removeObserver(bgObserver)
        super.onDestroy()
    }
}

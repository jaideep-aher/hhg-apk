package com.hhg.farmers.ui.screens.permissions

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.hhg.farmers.R
import com.hhg.farmers.permissions.isLocationGranted
import com.hhg.farmers.permissions.startupPermissionNames
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange500

/**
 * Hard location gate (delivery-app style).
 *
 * Flow:
 *  - Show a brief explanation + "Allow permissions" CTA.
 *  - Tap CTA → request ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION (plus optional
 *    notifications / media perms).
 *  - If the user grants location (fine OR coarse) → [onFinished] is called.
 *  - If the user denies BUT the OS still shows the rationale next time → the CTA
 *    simply retries the request.
 *  - If the user hits "Don't ask again" (permanent deny) → the CTA morphs into
 *    "Open App Settings" so they can enable it manually. We re-check on resume.
 *  - There is no skip button. The screen cannot be bypassed.
 */
@Composable
fun PermissionSetupScreen(
    onFinished: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current

    // True the moment we've asked at least once and the OS tells us further requests
    // won't show a dialog (i.e. the user picked "Don't ask again" or disabled at policy level).
    var permanentlyDenied by remember { mutableStateOf(false) }
    // Flip to true after the first dialog dismissal so we can show an inline error.
    var deniedOnce by remember { mutableStateOf(false) }
    // Auto-prompt only once per entry; afterwards user controls retries via CTA.
    var autoPromptTriggered by remember { mutableStateOf(false) }

    val permissionNames = remember { startupPermissionNames() }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val locationGranted =
            grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            isLocationGranted(context) // fallback: user may have already granted earlier
        if (locationGranted) {
            onFinished()
        } else {
            deniedOnce = true
            // On Android, shouldShowRequestPermissionRationale returns false AFTER a
            // denial only when the OS will no longer show the system prompt — i.e.
            // permanent denial. On first-ever denial it still returns true.
            permanentlyDenied = activity?.let {
                !ActivityCompat.shouldShowRequestPermissionRationale(
                    it,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) && !ActivityCompat.shouldShowRequestPermissionRationale(
                    it,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            } ?: false
        }
    }

    // If the user leaves to system Settings to enable location and comes back, re-check
    // on every ON_RESUME and auto-advance if they've granted it.
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && isLocationGranted(context)) {
                onFinished()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // In case we arrive here with location already granted (edge case: user toggled
    // perms while app was backgrounded, navigation re-entered this screen), short
    // circuit immediately.
    LaunchedEffect(Unit) {
        if (isLocationGranted(context)) onFinished()
    }

    LaunchedEffect(permanentlyDenied, autoPromptTriggered) {
        if (!isLocationGranted(context) && !permanentlyDenied && !autoPromptTriggered) {
            autoPromptTriggered = true
            launcher.launch(permissionNames)
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = stringResource(R.string.permission_setup_title)) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.permission_setup_intro),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
            )
            Spacer(Modifier.height(20.dp))

            Text(
                text = stringResource(R.string.permission_required_banner),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = HhgOrange500
            )
            Spacer(Modifier.height(16.dp))

            PermissionBullet(
                icon = { Icon(Icons.Filled.LocationOn, contentDescription = null, tint = HhgOrange500) },
                text = stringResource(R.string.permission_bullet_location_required)
            )
            Spacer(Modifier.height(12.dp))
            PermissionBullet(
                icon = { Icon(Icons.Filled.Notifications, contentDescription = null, tint = HhgOrange500) },
                text = stringResource(R.string.permission_bullet_notifications)
            )
            Spacer(Modifier.height(12.dp))
            PermissionBullet(
                icon = { Icon(Icons.Filled.FolderOpen, contentDescription = null, tint = HhgOrange500) },
                text = stringResource(R.string.permission_bullet_storage)
            )

            if (deniedOnce) {
                Spacer(Modifier.height(24.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = HhgOrange500.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = if (permanentlyDenied) {
                            stringResource(R.string.permission_denied_permanently)
                        } else {
                            stringResource(R.string.permission_denied_retry)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            Button(
                onClick = {
                    if (permanentlyDenied) {
                        // Open the app's system settings page so the user can toggle
                        // Location on manually. We'll re-check in ON_RESUME.
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", context.packageName, null)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        context.startActivity(intent)
                    } else {
                        launcher.launch(permissionNames)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = if (permanentlyDenied) {
                        stringResource(R.string.permission_open_settings)
                    } else {
                        stringResource(R.string.permission_setup_allow)
                    },
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.permission_setup_note),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
            )
        }
    }
}

@Composable
private fun PermissionBullet(
    icon: @Composable () -> Unit,
    text: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start,
        verticalAlignment = Alignment.Top
    ) {
        icon()
        Spacer(Modifier.width(12.dp))
        Text(text = text, style = MaterialTheme.typography.bodyMedium)
    }
}

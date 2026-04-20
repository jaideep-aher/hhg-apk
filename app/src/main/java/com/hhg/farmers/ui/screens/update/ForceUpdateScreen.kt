package com.hhg.farmers.ui.screens.update

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SystemUpdateAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.hhg.farmers.BuildConfig
import com.hhg.farmers.R
import com.hhg.farmers.data.model.AppConfig
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgTheme

/**
 * The app's unskippable update blocker. Renders above everything else when
 * [com.hhg.farmers.service.update.UpdateGateState.ForceUpdate] is active.
 *
 * Blocks the back button — [BackHandler] intercepts and no-ops.
 * The only way out: tap "Update Now" which opens the Play Store listing, or
 * uninstall the app. This is the same pattern PhonePe, HDFC, and WhatsApp use.
 */
@Composable
fun ForceUpdateScreen(config: AppConfig) {
    // Swallow back button — user must update.
    BackHandler(enabled = true) { /* no-op */ }

    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // App brand wordmark — keeps users oriented that this
                // blocker belongs to Hanuman Hundekari, not a system dialog.
                Text(
                    text = stringResource(R.string.app_name_mr),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = HhgOrange500,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Hanuman Hundekari",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )

                Spacer(Modifier.height(20.dp))

                // Large orange update icon
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .background(HhgOrange500.copy(alpha = 0.12f), RoundedCornerShape(24.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.SystemUpdateAlt,
                        contentDescription = null,
                        tint = HhgOrange500,
                        modifier = Modifier.size(56.dp)
                    )
                }

                Spacer(Modifier.height(24.dp))

                Text(
                    text = config.forceUpdateTitle,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(Modifier.height(12.dp))

                Text(
                    text = config.forceUpdateMessage,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(Modifier.height(28.dp))

                Button(
                    onClick = {
                        // Build the Play Store URL from the app's actual package name so
                        // "Update now" always lands on the real listing — even if the
                        // applicationId has been renamed (e.g. com.tec.agrofixpartner)
                        // and any stale / blank URL from the backend config would
                        // otherwise point at "item not found".
                        val pkg = context.packageName
                        val fallbackUrl = "https://play.google.com/store/apps/details?id=$pkg"
                        val configuredUrl = config.playStoreUrl
                            .takeIf { it.isNotBlank() && it.contains("id=$pkg") }
                        val webUrl = configuredUrl ?: fallbackUrl

                        // Prefer opening the Play Store app directly via the market://
                        // scheme; fall back to the web URL if Play isn't installed
                        // (e.g. sideloaded device without Play Services).
                        val marketIntent = Intent(
                            Intent.ACTION_VIEW,
                            "market://details?id=$pkg".toUri()
                        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                        val webIntent = Intent(Intent.ACTION_VIEW, webUrl.toUri())
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                        runCatching { context.startActivity(marketIntent) }
                            .onFailure {
                                runCatching { context.startActivity(webIntent) }
                            }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = "अपडेट करा",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Small caption showing current installed version for support-call debugging
                Text(
                    text = "व्हर्जन: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }
        }
    }
}

/* ----------------------------- Preview ----------------------------- */

@Preview(name = "Force update", showBackground = true, locale = "mr")
@Composable
private fun ForceUpdatePreview() {
    HhgTheme {
        ForceUpdateScreen(config = AppConfig())
    }
}

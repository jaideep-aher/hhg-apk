package com.hhg.farmers.ui.screens.aitrend

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingFlat
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hhg.farmers.R
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.components.ErrorState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgTheme
import java.text.NumberFormat
import java.util.Locale

/**
 * Screen 5 — AI Market Trend.
 *
 * Shows AI-generated narratives + 7-day mini sparkline for each major commodity.
 * Rates are ₹/quintal (Maharashtra APMC standard unit).
 *
 * Data source: mock until the backend AI endpoint is live. The ViewModel structure is
 * identical whether the data comes from mock or real source — no screen change needed.
 */
@Composable
fun AiTrendScreen(
    viewModel: AiTrendViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            AppTopBar(
                showBack = false,
                title = stringResource(R.string.nav_ai_trend)
            )
        }
    ) { innerPadding ->
        when {
            state.isLoading -> LoadingState(modifier = Modifier.padding(innerPadding))
            state.errorMessage != null -> ErrorState(
                message = state.errorMessage!!,
                onRetry = viewModel::refresh,
                modifier = Modifier.padding(innerPadding)
            )
            else -> TrendContent(
                state = state,
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}

@Composable
private fun TrendContent(state: AiTrendUiState, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { AiBadgeHeader(lastUpdated = state.lastUpdated) }
        items(state.trends, key = { it.item }) { trend ->
            CommodityTrendCard(trend = trend)
        }
        item { AiDisclaimerFooter() }
    }
}

@Composable
private fun AiBadgeHeader(lastUpdated: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.AutoAwesome,
                contentDescription = null,
                tint = Color(0xFF9333EA),
                modifier = Modifier.size(20.dp)
            )
            Text(
                text = stringResource(R.string.ai_trend_powered_by),
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF9333EA),
                fontWeight = FontWeight.SemiBold
            )
        }
        if (lastUpdated.isNotEmpty()) {
            Text(
                text = stringResource(R.string.ai_trend_updated, lastUpdated),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
private fun CommodityTrendCard(trend: CommodityTrend) {
    val fmt = NumberFormat.getNumberInstance(Locale("mr", "IN")).apply { maximumFractionDigits = 0 }
    val isUp   = trend.trendPct > 0.5
    val isDown = trend.trendPct < -0.5
    val trendColor = when {
        isUp   -> Color(0xFF16A34A)
        isDown -> Color(0xFFDC2626)
        else   -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    }
    val trendIcon = when {
        isUp   -> Icons.Filled.TrendingUp
        isDown -> Icons.Filled.TrendingDown
        else   -> Icons.Filled.TrendingFlat
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // ── Header row: name + rate + trend ──────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = trend.itemMr,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = trend.item,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "₹${fmt.format(trend.currentRate)}/qtl",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = HhgOrange500
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Icon(
                            imageVector = trendIcon,
                            contentDescription = null,
                            tint = trendColor,
                            modifier = Modifier.size(16.dp)
                        )
                        val sign = if (trend.trendPct >= 0) "+" else ""
                        Text(
                            text = "$sign${"%.1f".format(trend.trendPct)}%",
                            style = MaterialTheme.typography.labelLarge,
                            color = trendColor,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))

            // ── 7-day mini sparkline ──────────────────────────────────────────
            MiniSparkline(rates = trend.weeklyRates, trendColor = trendColor)

            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(Modifier.height(12.dp))

            // ── AI narrative ──────────────────────────────────────────────────
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.Top
            ) {
                Icon(
                    imageVector = Icons.Filled.AutoAwesome,
                    contentDescription = null,
                    tint = Color(0xFF9333EA).copy(alpha = 0.7f),
                    modifier = Modifier.size(14.dp).padding(top = 2.dp)
                )
                Text(
                    text = trend.narrative,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                    fontStyle = FontStyle.Italic
                )
            }
        }
    }
}

/**
 * 7-bar sparkline drawn entirely with plain Compose Box composables.
 * No Vico/Canvas needed — simple and reliable at this scale.
 */
@Composable
private fun MiniSparkline(rates: List<Double>, trendColor: Color) {
    if (rates.isEmpty()) return
    val minRate = rates.min()
    val maxRate = rates.max()
    val range = (maxRate - minRate).coerceAtLeast(1.0)
    val maxBarHeight = 40.dp
    val labels = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom
        ) {
            rates.forEachIndexed { index, rate ->
                val fraction = ((rate - minRate) / range).toFloat().coerceIn(0.1f, 1f)
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Box(
                        modifier = Modifier
                            .width(28.dp)
                            .height(maxBarHeight * fraction)
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(
                                if (index == rates.lastIndex) trendColor
                                else trendColor.copy(alpha = 0.35f)
                            )
                    )
                }
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            labels.forEach { label ->
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
            }
        }
    }
}

@Composable
private fun AiDisclaimerFooter() {
    Text(
        text = stringResource(R.string.ai_trend_disclaimer),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
        fontStyle = FontStyle.Italic,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

/* ─────────────────────────── Previews ─────────────────────────────────── */

private val previewTrends = listOf(
    CommodityTrend(
        item = "Onion", itemMr = "कांदा",
        currentRate = 1850.0,
        weeklyRates = listOf(1600.0, 1700.0, 1750.0, 1720.0, 1800.0, 1830.0, 1850.0),
        trendPct = +15.6,
        narrative = "Onion rates have risen sharply this week due to reduced arrivals from Lasalgaon."
    ),
    CommodityTrend(
        item = "Tomato", itemMr = "टोमॅटो",
        currentRate = 950.0,
        weeklyRates = listOf(1200.0, 1150.0, 1100.0, 1050.0, 1000.0, 960.0, 950.0),
        trendPct = -20.8,
        narrative = "Tomato prices have corrected from high levels as new arrivals from Nashik increased supply."
    )
)

@Preview(showBackground = true, locale = "mr")
@Composable
private fun AiTrendScreenPreview() {
    HhgTheme {
        Scaffold(topBar = { AppTopBar(showBack = false, title = "AI मार्केट ट्रेंड") }) { padding ->
            TrendContent(
                state = AiTrendUiState(isLoading = false, lastUpdated = "19 Apr 2025", trends = previewTrends),
                modifier = Modifier.padding(padding)
            )
        }
    }
}

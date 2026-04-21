package com.hhg.farmers.ui.screens.othermarkets

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
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

/**
 * Screen 7 — Other Markets (APMC).
 *
 * Shows rate data for Lasalgaon, Pune, Mumbai, Nashik.
 * Market selector chips at top; rate table (min / max / modal) below.
 *
 * Real data source: agmarknet.gov.in (free, no API key).
 * Wire in when the backend proxy endpoint is ready.
 */
@Composable
fun OtherMarketsScreen(
    onBack: () -> Unit,
    viewModel: OtherMarketsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            AppTopBar(
                showBack = true,
                onBack = onBack,
                title = stringResource(R.string.other_markets_title)
            )
        }
    ) { innerPadding ->
        when {
            state.isLoading -> LoadingState(modifier = Modifier.padding(innerPadding))
            state.errorMessage != null -> ErrorState(
                message = state.errorMessage ?: stringResource(R.string.error_generic),
                onRetry = viewModel::refresh,
                modifier = Modifier.padding(innerPadding)
            )
            else -> MarketsContent(
                state = state,
                onSelectMarket = viewModel::selectMarket,
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}

@Composable
private fun MarketsContent(
    state: OtherMarketsUiState,
    onSelectMarket: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedMarket = state.markets.getOrNull(state.selectedMarketIndex) ?: return

    Column(modifier = modifier.fillMaxSize()) {
        // ── Market selector chips ─────────────────────────────────────────────
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(state.markets) { index, market ->
                FilterChip(
                    selected = index == state.selectedMarketIndex,
                    onClick = { onSelectMarket(index) },
                    label = { Text(market.marketNameMr) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = HhgOrange500.copy(alpha = 0.15f),
                        selectedLabelColor = HhgOrange500
                    )
                )
            }
        }

        // ── Date subtitle ─────────────────────────────────────────────────────
        Text(
            text = stringResource(R.string.rates_as_of, selectedMarket.date),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(Modifier.height(8.dp))

        // ── Rate table ────────────────────────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column {
                // Header row
                RateHeaderRow()
                HorizontalDivider()
                // Data rows
                selectedMarket.rates.forEachIndexed { i, rate ->
                    ApmcRateRow(rate = rate)
                    if (i < selectedMarket.rates.lastIndex) {
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.rates_source_apmc),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f),
            modifier = Modifier.padding(horizontal = 16.dp)
        )
    }
}

@Composable
private fun RateHeaderRow() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = stringResource(R.string.rate_item_label),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1.4f)
        )
        Text(
            text = stringResource(R.string.other_markets_min),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = stringResource(R.string.other_markets_max),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = stringResource(R.string.other_markets_modal),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = HhgOrange500,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun ApmcRateRow(rate: ApmcRate) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1.4f)) {
            Text(rate.itemMr, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Text(rate.item,   style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f))
        }
        Text(
            text = "₹${rate.minRate.toInt()}",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "₹${rate.maxRate.toInt()}",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = "₹${rate.modalRate.toInt()}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = HhgOrange500,
            modifier = Modifier.weight(1f)
        )
    }
}

/* ─────────────────────────── Preview ─────────────────────────────────── */

@Preview(showBackground = true, locale = "mr")
@Composable
private fun OtherMarketsPreview() {
    HhgTheme {
        OtherMarketsScreen(onBack = {})
    }
}

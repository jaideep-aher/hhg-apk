package com.hhg.farmers.ui.screens.marketrate

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import com.hhg.farmers.data.model.VendorRate
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.components.EmptyState
import com.hhg.farmers.ui.components.ErrorState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.theme.HhgTheme
import java.text.NumberFormat
import java.util.Locale

/**
 * Screen 4 — today's Hundekari rates.
 *
 * Simple two-column table: item | highest rate. Header sticks to the top of the list.
 * The web uses the same layout — recognition > novelty for rural farmers.
 */
@Composable
fun HundekariRatesScreen(
    onBack: () -> Unit,
    viewModel: HundekariRatesViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(topBar = { AppTopBar(onBack = onBack) }) { innerPadding ->
        val modifier = Modifier.fillMaxSize().padding(innerPadding)
        when {
            state.isLoading && state.rates.isEmpty() -> LoadingState(modifier)
            state.errorMessage != null && state.rates.isEmpty() ->
                ErrorState(
                    message = state.errorMessage ?: stringResource(R.string.error_generic),
                    onRetry = { viewModel.refresh() },
                    modifier = modifier
                )
            state.rates.isEmpty() ->
                EmptyState(stringResource(R.string.rate_no_data), modifier)
            else -> RatesTable(state.rates, modifier)
        }
    }
}

@Composable
private fun RatesTable(rates: List<VendorRate>, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Column {
                Text(
                    text = stringResource(R.string.hundekari_today_title),
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = stringResource(R.string.hundekari_today_subtitle),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(8.dp))
            }
        }
        item { HeaderRow() }
        items(rates, key = { it.item + it.date }) { rate -> RateRow(rate) }
    }
}

@Composable
private fun HeaderRow() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.rate_item_label),
                modifier = Modifier.weight(1f),
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = stringResource(R.string.rate_value_label),
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun RateRow(rate: VendorRate) {
    val fmt = NumberFormat.getNumberInstance(Locale("mr", "IN"))
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    // Prefer Marathi name from DB; fall back to English if not available
                    text = rate.itemMr ?: rate.item,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "₹ " + fmt.format(rate.highestRate),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            HorizontalDivider()
        }
    }
}

/* ----------------------------- Previews ----------------------------- */

private val previewRates = listOf(
    VendorRate(date = "2026-04-19", item = "Onion",   itemMr = "कांदा",      highestRate = 32.5),
    VendorRate(date = "2026-04-19", item = "Tomato",  itemMr = "टोमॅटो",    highestRate = 45.0),
    VendorRate(date = "2026-04-19", item = "Potato",  itemMr = "बटाटा",     highestRate = 28.75),
    VendorRate(date = "2026-04-19", item = "Chilli",  itemMr = "मिरची",     highestRate = 52.0),
    VendorRate(date = "2026-04-19", item = "Coriander", itemMr = "कोथिंबीर", highestRate = 38.25),
    VendorRate(date = "2026-04-19", item = "Methi",   itemMr = "मेथी",     highestRate = 41.5),
    VendorRate(date = "2026-04-19", item = "Spinach", itemMr = "पालक",      highestRate = 35.0)
)

@Preview(name = "Hundekari rates", showBackground = true, locale = "mr")
@Composable
private fun HundekariRatesPreview() {
    HhgTheme {
        Scaffold(topBar = { AppTopBar(onBack = {}) }) { padding ->
            RatesTable(previewRates, modifier = Modifier.padding(padding))
        }
    }
}

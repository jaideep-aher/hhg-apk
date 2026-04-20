package com.hhg.farmers.ui.screens.farmer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hhg.farmers.R
import com.hhg.farmers.data.model.Farmer
import com.hhg.farmers.data.model.PattiEntry
import com.hhg.farmers.data.model.PattiTotals
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.components.EmptyState
import com.hhg.farmers.ui.components.ErrorState
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.theme.HhgOrange100
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgOrange600
import com.hhg.farmers.ui.theme.HhgTheme
import java.text.NumberFormat
import java.util.Locale

/**
 * Screen 2 — Farmer dashboard.
 *
 * Sections:
 *   - Farmer info card (name, Aadhaar, mobile, address)
 *   - Daily market + AI trend CTAs
 *   - Totals row (payable / quantity / weight)
 *   - Patti list (most recent entries)
 *   - Share-as-PDF FAB-style button
 */
@Composable
fun FarmerDashboardScreen(
    uid: String,
    onBack: () -> Unit,
    onOpenMarketRates: () -> Unit,
    onOpenAiTrend: () -> Unit,
    onLogout: () -> Unit,
    viewModel: FarmerDashboardViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(uid) { viewModel.start(uid) }

    Scaffold(
        topBar = {
            AppTopBar(
                onBack = onBack,
                actions = {
                    IconButton(onClick = {
                        viewModel.logout()
                        onLogout()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = stringResource(R.string.nav_logout))
                    }
                }
            )
        }
    ) { innerPadding ->
        val modifier = Modifier.fillMaxSize().padding(innerPadding)
        when {
            state.page == null && state.isLoading -> Box(modifier) { LoadingState() }
            state.page == null && state.errorMessage != null ->
                ErrorState(
                    message = state.errorMessage ?: stringResource(R.string.home_error_generic),
                    onRetry = { viewModel.refresh() },
                    modifier = modifier
                )
            state.page == null ->
                EmptyState(message = stringResource(R.string.farmer_no_data), modifier = modifier)
            else -> DashboardContent(
                farmer = state.page!!.farmer,
                entries = state.page!!.entries,
                totals = state.totals,
                onOpenMarketRates = onOpenMarketRates,
                onOpenAiTrend = onOpenAiTrend,
                onShare = viewModel::sharePatti,
                modifier = modifier
            )
        }
    }
}

@Composable
private fun DashboardContent(
    farmer: Farmer,
    entries: List<PattiEntry>,
    totals: PattiTotals?,
    onOpenMarketRates: () -> Unit,
    onOpenAiTrend: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { FarmerInfoCard(farmer) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = onOpenMarketRates,
                    modifier = Modifier.weight(1f).height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Storefront, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        stringResource(R.string.farmer_daily_market_cta),
                        color = Color.White, fontWeight = FontWeight.SemiBold
                    )
                }
                Button(
                    onClick = onOpenAiTrend,
                    modifier = Modifier.weight(1f).height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF9333EA)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Insights, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        stringResource(R.string.farmer_ai_trend_cta),
                        color = Color.White, fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        if (totals != null) item { TotalsRow(totals) }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.farmer_patti_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        stringResource(R.string.farmer_patti_subtitle),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                OutlinedButton(onClick = onShare) {
                    Icon(Icons.Default.Share, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.farmer_share_patti))
                }
            }
        }
        if (entries.isEmpty()) {
            item { EmptyState(stringResource(R.string.farmer_no_data)) }
        } else {
            items(entries, key = { it.entryid }) { entry -> PattiRow(entry) }
        }
    }
}

@Composable
private fun FarmerInfoCard(farmer: Farmer) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = HhgOrange100),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = farmer.farmername,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = HhgOrange600
            )
            Spacer(Modifier.height(10.dp))
            InfoRow(stringResource(R.string.farmer_aadhaar_label), farmer.uid)
            InfoRow(
                stringResource(R.string.farmer_mobile_label),
                farmer.mobilenumber ?: stringResource(R.string.farmer_no_mobile_info)
            )
            InfoRow(
                stringResource(R.string.farmer_address_label),
                farmer.farmeraddress ?: stringResource(R.string.farmer_no_address_info)
            )
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(
            text = "$label: ",
            fontWeight = FontWeight.SemiBold,
            style = MaterialTheme.typography.bodyMedium
        )
        Text(text = value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun TotalsRow(totals: PattiTotals) {
    val fmt = NumberFormat.getNumberInstance(Locale("mr", "IN"))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        TotalCell(label = "देय", value = "₹ " + fmt.format(totals.totalPayable), modifier = Modifier.weight(1f))
        TotalCell(label = "माल", value = fmt.format(totals.totalQuantity), modifier = Modifier.weight(1f))
        TotalCell(label = "वजन", value = fmt.format(totals.totalWeight), modifier = Modifier.weight(1f))
    }
}

@Composable
private fun TotalCell(label: String, value: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(vertical = 12.dp, horizontal = 10.dp)
    ) {
        Column {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun PattiRow(entry: PattiEntry) {
    val fmt = NumberFormat.getNumberInstance(Locale("mr", "IN"))
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(entry.item, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleSmall)
                Text(entry.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(6.dp))
            Text(entry.vendorname, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                PattiStat("वजन", fmt.format(entry.weight))
                PattiStat("दर", "₹ " + fmt.format(entry.rate))
                PattiStat("देय", "₹ " + fmt.format(entry.payable ?: 0.0))
            }
        }
    }
}

@Composable
private fun PattiStat(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
    }
}

/* ----------------------------- Previews ----------------------------- */

private val previewFarmer = Farmer(
    farmerid = 1001,
    uid = "55555",
    farmername = "रामराव पाटील",
    mobilenumber = "9876543210",
    farmeraddress = "मु. पो. साकूर, ता. संगमनेर, जि. अहमदनगर",
    status = "ACTIVE"
)

private val previewEntries = listOf(
    PattiEntry(
        entryid = 1, farmerid = 1001, date = "2026-04-19",
        vendorname = "शिवाजी ट्रेडर्स", quantity = 25.0, weight = 420.0,
        rate = 32.5, item = "कांदा", payable = 13650.0, paid = null, paiddate = null
    ),
    PattiEntry(
        entryid = 2, farmerid = 1001, date = "2026-04-18",
        vendorname = "अशोक ट्रेडिंग", quantity = 18.0, weight = 295.0,
        rate = 45.0, item = "टोमॅटो", payable = 13275.0, paid = 13275.0, paiddate = "2026-04-21"
    ),
    PattiEntry(
        entryid = 3, farmerid = 1001, date = "2026-04-17",
        vendorname = "कृष्णा ट्रेडर्स", quantity = 30.0, weight = 512.0,
        rate = 28.0, item = "बटाटा", payable = 14336.0, paid = 14336.0, paiddate = "2026-04-20"
    )
)

private val previewTotals = PattiTotals(
    totalPayable = 41261.0,
    totalQuantity = 73.0,
    totalWeight = 1227.0
)

@Preview(name = "Farmer dashboard", showBackground = true, heightDp = 900, locale = "mr")
@Composable
private fun FarmerDashboardPreview() {
    HhgTheme {
        Scaffold(topBar = { AppTopBar(onBack = {}) }) { padding ->
            DashboardContent(
                farmer = previewFarmer,
                entries = previewEntries,
                totals = previewTotals,
                onOpenMarketRates = {},
                onOpenAiTrend = {},
                onShare = {},
                modifier = Modifier.padding(padding)
            )
        }
    }
}

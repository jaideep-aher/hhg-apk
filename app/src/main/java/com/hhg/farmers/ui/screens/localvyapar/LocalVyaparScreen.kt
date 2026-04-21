package com.hhg.farmers.ui.screens.localvyapar

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hhg.farmers.R
import com.hhg.farmers.data.model.LocalVyaparAd
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.theme.Success900

@Composable
fun LocalVyaparScreen(
    onBack: () -> Unit,
    viewModel: LocalVyaparViewModel = hiltViewModel()
) {
    val ui by viewModel.state.collectAsStateWithLifecycle()
    val filtered = filteredAds(ui)

    Scaffold(
        topBar = {
            AppTopBar(
                onBack = onBack,
                title = stringResource(R.string.local_vyapar_title)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Text(
                text = stringResource(R.string.local_vyapar_headline),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                textAlign = TextAlign.Center
            )
            InfoBanner()
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = ui.searchQuery,
                onValueChange = viewModel::onSearchChange,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null)
                },
                placeholder = { Text(stringResource(R.string.local_vyapar_search_hint)) }
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = ui.sortField == LocalVyaparSortField.AskingPrice,
                    onClick = { viewModel.setSortField(LocalVyaparSortField.AskingPrice) },
                    label = { Text(stringResource(R.string.local_vyapar_sort_price)) }
                )
                FilterChip(
                    selected = ui.sortField == LocalVyaparSortField.RequiredDate,
                    onClick = { viewModel.setSortField(LocalVyaparSortField.RequiredDate) },
                    label = { Text(stringResource(R.string.local_vyapar_sort_date)) }
                )
                FilterChip(
                    selected = ui.sortField == LocalVyaparSortField.RequiredWeight,
                    onClick = { viewModel.setSortField(LocalVyaparSortField.RequiredWeight) },
                    label = { Text(stringResource(R.string.local_vyapar_sort_weight)) }
                )
                IconButton(
                    onClick = { viewModel.setSortField(ui.sortField) }
                ) {
                    Icon(
                        Icons.Default.SwapVert,
                        contentDescription = stringResource(R.string.local_vyapar_toggle_order)
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            when {
                ui.loading -> LoadingState(modifier = Modifier.weight(1f))
                ui.error != null -> {
                    Text(
                        text = ui.error ?: stringResource(R.string.error_generic),
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(16.dp)
                    )
                    Button(onClick = { viewModel.refresh() }) {
                        Text(stringResource(R.string.retry))
                    }
                }
                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 300.dp),
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filtered, key = { it.advId }) { ad ->
                            VyaparAdCard(ad)
                        }
                    }
                }
            }
        }
    }
}

private fun filteredAds(ui: LocalVyaparUiState): List<LocalVyaparAd> {
    val q = ui.searchQuery.trim().lowercase()
    var list = ui.ads.filter { ad ->
        if (q.isEmpty()) true
        else ad.item.lowercase().contains(q) || ad.vyapariName.lowercase().contains(q)
    }
    val cmp: Comparator<LocalVyaparAd> = when (ui.sortField) {
        LocalVyaparSortField.AskingPrice ->
            compareBy { it.askingPrice ?: 0.0 }
        LocalVyaparSortField.RequiredDate ->
            compareBy { it.requiredDate.orEmpty() }
        LocalVyaparSortField.RequiredWeight ->
            compareBy { it.requiredWeight ?: 0.0 }
    }
    list = if (ui.sortAscending) list.sortedWith(cmp) else list.sortedWith(cmp.reversed())
    return list
}

@Composable
private fun InfoBanner() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEFCE8)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            Modifier.padding(10.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFCA8A04))
            Text(
                text = stringResource(R.string.local_vyapar_disclaimer),
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFFA16207)
            )
        }
    }
}

@Composable
private fun VyaparAdCard(ad: LocalVyaparAd) {
    val statusFg = when (ad.status) {
        "Active" -> Success900
        "Pending" -> Color(0xFF854D0E)
        "Fulfilled" -> Color(0xFF1E40AF)
        "Cancelled" -> Color(0xFF991B1B)
        else -> Color(0xFF3F3F46)
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(2.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = ad.item,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = ad.status,
                    style = MaterialTheme.typography.labelSmall,
                    color = statusFg,
                    modifier = Modifier.padding(start = 8.dp),
                    fontWeight = FontWeight.SemiBold
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Default.Person, null, Modifier.size(16.dp), tint = Color.Gray)
                Text(
                    ad.vyapariName,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Inventory2, null, Modifier.size(14.dp), tint = Color.Gray)
                    Text(
                        "${ad.requiredWeight?.toInt() ?: "—"} kg",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AccessTime, null, Modifier.size(14.dp), tint = Color.Gray)
                    Text(
                        formatShortDate(ad.requiredDate),
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1
                    )
                }
            }
            ad.description?.takeIf { it.isNotBlank() }?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF52525B),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Text(
                    "₹${ad.askingPrice?.toInt() ?: "—"}",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF16A34A)
                )
                Text(
                    stringResource(R.string.local_vyapar_per_kg),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = { },
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                    disabledContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
            ) {
                Text(stringResource(R.string.local_vyapar_readonly_cta))
            }
        }
    }
}

private fun formatShortDate(raw: String?): String {
    if (raw.isNullOrBlank()) return "—"
    return raw.take(10)
}

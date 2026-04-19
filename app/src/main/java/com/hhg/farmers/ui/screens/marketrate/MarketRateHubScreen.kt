package com.hhg.farmers.ui.screens.marketrate

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hhg.farmers.R
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange100
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgOrange600

/**
 * Screen 3 — Market rate hub.
 *
 * Two large tappable cards: "Hundekari rates" (our rates) and "Other markets" (APMC etc.).
 * Keeps the choice obvious on small screens where dropdowns are fiddly.
 */
@Composable
fun MarketRateHubScreen(
    onBack: () -> Unit,
    onHundekariClick: () -> Unit,
    onOtherMarketsClick: () -> Unit
) {
    Scaffold(topBar = { AppTopBar(onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            HubCard(
                title = stringResource(R.string.market_hub_hundekari_title),
                subtitle = stringResource(R.string.market_hub_hundekari_subtitle),
                cta = stringResource(R.string.market_hub_hundekari_cta),
                icon = Icons.Default.Storefront,
                accent = HhgOrange500,
                tint = HhgOrange100,
                onClick = onHundekariClick
            )
            HubCard(
                title = stringResource(R.string.market_hub_other_title),
                subtitle = stringResource(R.string.market_hub_other_subtitle),
                cta = stringResource(R.string.market_hub_other_cta),
                icon = Icons.Default.Store,
                accent = Color(0xFF9333EA),
                tint = Color(0xFFF3E8FF),
                onClick = onOtherMarketsClick
            )
        }
    }
}

@Composable
private fun HubCard(
    title: String,
    subtitle: String,
    cta: String,
    icon: ImageVector,
    accent: Color,
    tint: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = tint),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = accent)
                Spacer(Modifier.width(10.dp))
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleLarge,
                    color = HhgOrange600
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier.fillMaxWidth().height(44.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                Text(
                    text = cta,
                    color = accent,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = accent)
            }
        }
    }
}

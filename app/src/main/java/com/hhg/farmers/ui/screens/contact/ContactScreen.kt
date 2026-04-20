package com.hhg.farmers.ui.screens.contact

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hhg.farmers.R
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange500

/**
 * "Contact" page — reachable from the drawer. Static content for now.
 *
 * When we have a real phone number / WhatsApp number configured, wire the rows
 * to `Intent(Intent.ACTION_DIAL)` and the existing `whatsapp://send?phone=...` deep link.
 */
@Composable
fun ContactScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            AppTopBar(
                onBack = onBack,
                title = stringResource(R.string.contact_title)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column {
                    ContactRow(
                        icon = Icons.Filled.LocationOn,
                        label = stringResource(R.string.contact_office_label),
                        value = stringResource(R.string.contact_office_value)
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    ContactRow(
                        icon = Icons.Filled.Phone,
                        label = stringResource(R.string.contact_phone_label),
                        value = stringResource(R.string.contact_phone_value)
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    ContactRow(
                        icon = Icons.Filled.Chat,
                        label = stringResource(R.string.contact_whatsapp_label),
                        value = stringResource(R.string.contact_whatsapp_value)
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))
                    ContactRow(
                        icon = Icons.Filled.AccessTime,
                        label = stringResource(R.string.contact_hours_label),
                        value = stringResource(R.string.contact_hours_value)
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactRow(
    icon: ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Icon(icon, contentDescription = null, tint = HhgOrange500, modifier = Modifier.size(22.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

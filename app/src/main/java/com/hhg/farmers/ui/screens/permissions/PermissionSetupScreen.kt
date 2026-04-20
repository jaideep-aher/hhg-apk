package com.hhg.farmers.ui.screens.permissions

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.material3.TextButton
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hhg.farmers.R
import com.hhg.farmers.permissions.startupPermissionNames
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange500

@Composable
fun PermissionSetupScreen(
    onFinished: () -> Unit
) {
    val permissionNames = remember { startupPermissionNames() }
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { onFinished() }

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
            Spacer(Modifier.height(24.dp))

            PermissionBullet(
                icon = { Icon(Icons.Filled.LocationOn, contentDescription = null, tint = HhgOrange500) },
                text = stringResource(R.string.permission_bullet_location)
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

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = { launcher.launch(permissionNames) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    stringResource(R.string.permission_setup_allow),
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onFinished,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.permission_setup_skip))
            }

            Spacer(Modifier.height(8.dp))
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

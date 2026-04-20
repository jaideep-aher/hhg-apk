package com.hhg.farmers.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hhg.farmers.R
import com.hhg.farmers.ui.theme.HhgOrange500

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    /** Pass a non-null lambda to show the back arrow. */
    onBack: (() -> Unit)? = null,
    /** Convenience flag — when true and [onBack] is null, icon is shown but non-functional. */
    showBack: Boolean = onBack != null,
    /** Optional custom title. Defaults to the app name in brand orange. */
    title: String? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    CenterAlignedTopAppBar(
        title = {
            Row(modifier = Modifier.padding(horizontal = 4.dp)) {
                if (title != null) {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold
                    )
                } else {
                    Text(
                        text = stringResource(R.string.app_name),
                        color = HhgOrange500,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }
        },
        navigationIcon = {
            if (showBack || onBack != null) {
                IconButton(onClick = { onBack?.invoke() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null)
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors()
    )
}

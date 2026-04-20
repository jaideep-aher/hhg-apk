package com.hhg.farmers.ui.screens.notice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.hhg.farmers.R
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.theme.HhgOrange100
import com.hhg.farmers.ui.theme.HhgTheme

/**
 * Screen 6 — Notice Detail.
 *
 * Receives [title] and [content] from the nav back-stack (URL-decoded by the nav host).
 * No ViewModel needed — the data is small and already loaded by HomeViewModel when the user
 * tapped the notice card.
 */
@Composable
fun NoticeDetailScreen(
    title: String,
    content: String,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            AppTopBar(
                showBack = true,
                onBack = onBack,
                title = stringResource(R.string.notice_detail_title)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Highlight banner
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(HhgOrange100)
                    .padding(16.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF9A3412) // deep orange-red
                )
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text = content,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = MaterialTheme.typography.bodyLarge.fontSize * 1.6f
            )
        }
    }
}

/* ─────────────────────────── Preview ─────────────────────────────────── */

@Preview(showBackground = true, locale = "mr")
@Composable
private fun NoticeDetailPreview() {
    HhgTheme {
        NoticeDetailScreen(
            title = "AI स्मार्ट मार्केट ट्रेंड्स",
            content = "मागील दोन वर्षांच्या बाजारातील ट्रेंड, सीझनल बदल आणि भविष्यातील अंदाज या सर्व माहितीचा उपयोग करून आमची AI प्रणाली तुम्हाला सर्वोत्तम भाव मिळवण्यास मदत करते. " +
                    "दर आठवड्याला अपडेट होणारे ट्रेंड्स, कांदा, टोमॅटो, लसूण आणि बटाटा यांच्यासाठी उपलब्ध आहेत.\n\n" +
                    "या सेवेचा उपयोग करण्यासाठी AI ट्रेंड बटणावर क्लिक करा.",
            onBack = {}
        )
    }
}

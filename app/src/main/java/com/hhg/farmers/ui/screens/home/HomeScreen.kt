package com.hhg.farmers.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Thermostat
import androidx.compose.material.icons.filled.Water
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.hhg.farmers.R
import com.hhg.farmers.data.model.Notice
import com.hhg.farmers.service.weather.wmoDescription
import com.hhg.farmers.service.weather.wmoDescriptionMr
import com.hhg.farmers.ui.components.AppTopBar
import com.hhg.farmers.ui.components.LoadingState
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgTheme

/**
 * Screen 1 — Home.
 *
 * Core blocks match the mobile web (`page.jsx`): search card, notices, AI trend CTA.
 *
 * **Android-only additions** (not removed when aligning branding): Sangamner weather
 * strip, native bottom navigation + drawer, optional location permission for future
 * geo features, and the app gate / force-update flow — see [MainScaffold].
 */
@Composable
fun HomeScreen(
    onFarmerFound: (uid: String) -> Unit,
    onAiTrendClick: () -> Unit,
    onNoticeClick: (title: String, content: String) -> Unit = { _, _ -> },
    onMenuClick: (() -> Unit)? = null,
    viewModel: HomeViewModel = hiltViewModel(),
    weatherViewModel: WeatherViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val event by viewModel.events.collectAsStateWithLifecycle()
    val weatherState by weatherViewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(event) {
        when (val e = event) {
            is HomeEvent.NavigateToFarmer -> {
                onFarmerFound(e.uid)
                viewModel.onEventHandled()
            }
            null -> Unit
        }
    }

    Scaffold(topBar = { AppTopBar(onMenuClick = onMenuClick) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Weather card (Open-Meteo, no key needed)
            if (!weatherState.isLoading && weatherState.weather != null) {
                WeatherCard(weatherState.weather!!)
            }

            SearchCard(
                aadhaar = state.aadhaar,
                isSearching = state.isSearching,
                error = state.searchError,
                onAadhaarChange = viewModel::onAadhaarChange,
                onSearch = viewModel::onSearch
            )

            NoticesBlock(
                loading = state.noticesLoading,
                notices = state.notices,
                onNoticeClick = onNoticeClick
            )

            AiTrendButton(onClick = onAiTrendClick)
        }
    }
}

@Composable
private fun SearchCard(
    aadhaar: String,
    isSearching: Boolean,
    error: SearchError?,
    onAadhaarChange: (String) -> Unit,
    onSearch: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.home_search_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = aadhaar,
                onValueChange = onAadhaarChange,
                label = { Text(stringResource(R.string.home_aadhaar_hint)) },
                singleLine = true,
                enabled = !isSearching,
                isError = error != null,
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                    imeAction = ImeAction.Search
                ),
                keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                modifier = Modifier.fillMaxWidth()
            )
            if (error != null) {
                val msg = when (error) {
                    SearchError.Invalid -> stringResource(R.string.home_invalid_aadhaar)
                    SearchError.NotFound -> stringResource(R.string.home_not_found)
                    SearchError.Generic -> stringResource(R.string.home_error_generic)
                }
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onSearch,
                enabled = !isSearching && aadhaar.length == 5,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500)
            ) {
                Text(
                    text = if (isSearching)
                        stringResource(R.string.home_checking)
                    else
                        stringResource(R.string.home_search_button),
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun WeatherCard(weather: com.hhg.farmers.service.weather.WeatherResponse) {
    val cw = weather.currentWeather
    val (_, emoji) = wmoDescription(cw.weatherCode)
    val descMr = wmoDescriptionMr(cw.weatherCode)
    val daily = weather.daily

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(emoji, style = MaterialTheme.typography.headlineLarge)
                Column {
                    Text(
                        text = "${cw.tempC.toInt()}°C  $descMr",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = stringResource(R.string.weather_sangamner),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            }
            // 3-day rain forecast (useful for farmers)
            if (daily != null && daily.rainMm.isNotEmpty()) {
                Column(horizontalAlignment = Alignment.End) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(Icons.Filled.Water, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(14.dp))
                        Text(
                            text = "${daily.rainMm.take(3).sum().toInt()} mm / 3 days",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFF3B82F6)
                        )
                    }
                    Text(
                        text = "↑${daily.maxTemp.firstOrNull()?.toInt()}° ↓${daily.minTemp.firstOrNull()?.toInt()}°",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            }
        }
    }
}

@Composable
private fun NoticesBlock(
    loading: Boolean,
    notices: List<Notice>,
    onNoticeClick: (title: String, content: String) -> Unit = { _, _ -> }
) {
    Column {
        Text(
            text = stringResource(R.string.home_notices_title),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(8.dp))
        when {
            loading -> LoadingState()
            notices.isEmpty() -> Unit
            else -> LazyRow(
                contentPadding = PaddingValues(vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(notices, key = { it.id }) { NoticeCard(it, onNoticeClick) }
            }
        }
    }
}

@Composable
private fun NoticeCard(
    notice: Notice,
    onClick: (title: String, content: String) -> Unit = { _, _ -> }
) {
    val bg = runCatching { Color(android.graphics.Color.parseColor(notice.colorHex ?: "#FFEDD5")) }
        .getOrDefault(Color(0xFFFFEDD5))
    Box(
        modifier = Modifier
            .width(280.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(bg)
            .then(Modifier.clickable { onClick(notice.title, notice.content) })
            .padding(14.dp)
    ) {
        Column {
            Text(
                text = notice.title,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleSmall,
                color = Color(0xFF0F172A)
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = notice.content,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF334155),
                maxLines = 3
            )
        }
    }
}

@Composable
private fun AiTrendButton(onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(56.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF9333EA)
        ),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Insights, contentDescription = null, tint = Color.White)
            Spacer(Modifier.width(8.dp))
            Text(
                text = stringResource(R.string.home_ai_trend_cta),
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
        }
    }
}

/* ----------------------------- Previews ----------------------------- */

private val previewNotices = listOf(
    Notice(
        id = "n1",
        title = "AI स्मार्ट मार्केट ट्रेंड्स",
        content = "मागील दोन वर्षांच्या बाजारातील ट्रेंड, सीझनल बदल आणि अंदाज मिळवा.",
        colorHex = "#F3E8FF"
    ),
    Notice(
        id = "n2",
        title = "2026 वर्षाच्या शुभेच्छा",
        content = "सर्व शेतकरी व व्यापारी बांधवाना हार्दिक शुभेच्छा.",
        colorHex = "#DCFCE7"
    )
)

@Preview(name = "Home – Marathi", showBackground = true, locale = "mr")
@Composable
private fun HomeScreenPreview() {
    HhgTheme {
        Scaffold(topBar = { AppTopBar() }) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                SearchCard(aadhaar = "55555", isSearching = false, error = null, onAadhaarChange = {}, onSearch = {})
                NoticesBlock(loading = false, notices = previewNotices)
                AiTrendButton(onClick = {})
            }
        }
    }
}

@Preview(name = "Home – not found", showBackground = true, locale = "mr")
@Composable
private fun HomeScreenNotFoundPreview() {
    HhgTheme {
        Scaffold(topBar = { AppTopBar() }) { padding ->
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                SearchCard(aadhaar = "99999", isSearching = false, error = SearchError.NotFound, onAadhaarChange = {}, onSearch = {})
                NoticesBlock(loading = false, notices = previewNotices)
                AiTrendButton(onClick = {})
            }
        }
    }
}

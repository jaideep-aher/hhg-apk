package com.hhg.farmers.ui.screens.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hhg.farmers.R
import com.hhg.farmers.ui.theme.HhgOrange100
import com.hhg.farmers.ui.theme.HhgOrange500
import com.hhg.farmers.ui.theme.HhgOrange600
import com.hhg.farmers.ui.theme.HhgTheme
import kotlinx.coroutines.launch

private data class OnboardingPage(
    val icon: ImageVector,
    val iconBg: Color,
    val iconTint: Color,
    val titleRes: Int,
    val bodyRes: Int
)

private val pages = listOf(
    OnboardingPage(
        icon = Icons.Filled.Agriculture,
        iconBg = Color(0xFFFFEDD5),
        iconTint = HhgOrange500,
        titleRes = R.string.onboard_page1_title,
        bodyRes  = R.string.onboard_page1_body
    ),
    OnboardingPage(
        icon = Icons.Filled.TrendingUp,
        iconBg = Color(0xFFDCFCE7),
        iconTint = Color(0xFF16A34A),
        titleRes = R.string.onboard_page2_title,
        bodyRes  = R.string.onboard_page2_body
    ),
    OnboardingPage(
        icon = Icons.Filled.AutoAwesome,
        iconBg = Color(0xFFF3E8FF),
        iconTint = Color(0xFF9333EA),
        titleRes = R.string.onboard_page3_title,
        bodyRes  = R.string.onboard_page3_body
    )
)

/**
 * Screen 9 — Onboarding.
 *
 * Shown once on first launch (checked via [SessionStore.onboarded]).
 * Three swipe-able pages: welcome → market rates → AI trends.
 * On the last page "Get Started" marks onboarding complete and navigates to Home.
 *
 * No ViewModel needed — navigation is the only side-effect and it's handled
 * by the caller via [onFinished].
 */
@Composable
fun OnboardingScreen(onFinished: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val scope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == pages.lastIndex

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // App wordmark
            Text(
                text = stringResource(R.string.app_name_mr),
                style = MaterialTheme.typography.headlineLarge,
                color = HhgOrange500,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.padding(top = 32.dp)
            )

            Spacer(Modifier.height(32.dp))

            // ── Pager ─────────────────────────────────────────────────────────
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f)
            ) { page ->
                OnboardingPageContent(page = pages[page])
            }

            // ── Page indicator dots ───────────────────────────────────────────
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 24.dp)
            ) {
                repeat(pages.size) { index ->
                    val isSelected = index == pagerState.currentPage
                    Box(
                        modifier = Modifier
                            .size(if (isSelected) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(
                                if (isSelected) HhgOrange500
                                else HhgOrange500.copy(alpha = 0.25f)
                            )
                    )
                }
            }

            // ── CTA buttons ───────────────────────────────────────────────────
            AnimatedVisibility(visible = isLastPage, enter = fadeIn(), exit = fadeOut()) {
                Button(
                    onClick = onFinished,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Filled.CheckCircle, contentDescription = null, tint = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        stringResource(R.string.onboard_get_started),
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            AnimatedVisibility(visible = !isLastPage, enter = fadeIn(), exit = fadeOut()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onFinished,
                        shape = RoundedCornerShape(12.dp)
                    ) { Text(stringResource(R.string.onboard_skip)) }
                    Button(
                        onClick = {
                            scope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = HhgOrange500),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text(stringResource(R.string.onboard_next), fontWeight = FontWeight.SemiBold) }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun OnboardingPageContent(page: OnboardingPage) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(page.iconBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = page.icon,
                contentDescription = null,
                tint = page.iconTint,
                modifier = Modifier.size(60.dp)
            )
        }

        Spacer(Modifier.height(32.dp))

        Text(
            text = stringResource(page.titleRes),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            lineHeight = 32.sp
        )

        Spacer(Modifier.height(16.dp))

        Text(
            text = stringResource(page.bodyRes),
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
            lineHeight = 24.sp,
            modifier = Modifier.padding(horizontal = 8.dp)
        )
    }
}

/* ─────────────────────────── Preview ─────────────────────────────────── */

@Preview(showBackground = true, locale = "mr")
@Composable
private fun OnboardingPreview() {
    HhgTheme { OnboardingScreen(onFinished = {}) }
}

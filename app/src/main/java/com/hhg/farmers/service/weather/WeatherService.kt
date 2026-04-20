package com.hhg.farmers.service.weather

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Open-Meteo weather API — completely free, no API key required.
 * Docs: https://open-meteo.com/en/docs
 *
 * Callers pass latitude/longitude — typically device GPS when permission is granted,
 * else [com.hhg.farmers.service.weather.WeatherLocation.GHARGAON_LAT]/[GHARGAON_LON] for Ghargaon.
 */
interface WeatherService {
    @GET("v1/forecast")
    suspend fun getCurrentWeather(
        @Query("latitude") lat: Double,
        @Query("longitude") lon: Double,
        @Query("current_weather") currentWeather: Boolean = true,
        @Query("daily") daily: String = "precipitation_sum,temperature_2m_max,temperature_2m_min",
        @Query("forecast_days") forecastDays: Int = 3,
        @Query("timezone") timezone: String = "Asia/Kolkata"
    ): WeatherResponse
}

@JsonClass(generateAdapter = true)
data class WeatherResponse(
    @Json(name = "current_weather") val currentWeather: CurrentWeather,
    @Json(name = "daily")           val daily: DailyForecast? = null
)

@JsonClass(generateAdapter = true)
data class CurrentWeather(
    @Json(name = "temperature")  val tempC: Double,
    @Json(name = "windspeed")    val windspeedKmh: Double,
    @Json(name = "weathercode")  val weatherCode: Int,
    @Json(name = "is_day")       val isDay: Int = 1
)

@JsonClass(generateAdapter = true)
data class DailyForecast(
    val time: List<String>,
    @Json(name = "temperature_2m_max")   val maxTemp: List<Double>,
    @Json(name = "temperature_2m_min")   val minTemp: List<Double>,
    @Json(name = "precipitation_sum")    val rainMm: List<Double>
)

/** Maps WMO weather interpretation code to a simple English label + emoji. */
fun wmoDescription(code: Int): Pair<String, String> = when (code) {
    0            -> "Clear sky"     to "☀️"
    1, 2         -> "Mainly clear"  to "🌤️"
    3            -> "Overcast"      to "☁️"
    45, 48       -> "Foggy"         to "🌫️"
    51, 53, 55   -> "Drizzle"       to "🌦️"
    61, 63, 65   -> "Rain"          to "🌧️"
    71, 73, 75   -> "Snow"          to "❄️"
    80, 81, 82   -> "Rain showers"  to "🌧️"
    95           -> "Thunderstorm"  to "⛈️"
    96, 99       -> "Hailstorm"     to "⛈️"
    else         -> "Weather"       to "🌡️"
}

/** Marathi labels for WMO codes — for farmers who use the Marathi locale. */
fun wmoDescriptionMr(code: Int): String = when (code) {
    0            -> "स्वच्छ आकाश"
    1, 2         -> "ढगाळ"
    3            -> "पूर्ण ढगाळ"
    45, 48       -> "धुके"
    51, 53, 55   -> "हलका पाऊस"
    61, 63, 65   -> "पाऊस"
    71, 73, 75   -> "बर्फ"
    80, 81, 82   -> "पावसाचे झोके"
    95, 96, 99   -> "वादळ / गारपीट"
    else         -> "हवामान"
}

-if class com.hhg.farmers.data.model.MarketRate
-keepnames class com.hhg.farmers.data.model.MarketRate
-if class com.hhg.farmers.data.model.MarketRate
-keep class com.hhg.farmers.data.model.MarketRateJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

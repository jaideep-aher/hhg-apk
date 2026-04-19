-if class com.hhg.farmers.data.model.PattiEntry
-keepnames class com.hhg.farmers.data.model.PattiEntry
-if class com.hhg.farmers.data.model.PattiEntry
-keep class com.hhg.farmers.data.model.PattiEntryJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

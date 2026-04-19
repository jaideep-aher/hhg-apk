-if class com.hhg.farmers.data.model.Farmer
-keepnames class com.hhg.farmers.data.model.Farmer
-if class com.hhg.farmers.data.model.Farmer
-keep class com.hhg.farmers.data.model.FarmerJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}

-if class com.hhg.farmers.data.model.Notice
-keepnames class com.hhg.farmers.data.model.Notice
-if class com.hhg.farmers.data.model.Notice
-keep class com.hhg.farmers.data.model.NoticeJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.hhg.farmers.data.model.Notice
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-if class com.hhg.farmers.data.model.Notice
-keepclassmembers class com.hhg.farmers.data.model.Notice {
    public synthetic <init>(java.lang.String,java.lang.String,java.lang.String,java.lang.String,java.lang.String,java.lang.String,int,kotlin.jvm.internal.DefaultConstructorMarker);
}

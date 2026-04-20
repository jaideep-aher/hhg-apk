package com.hhg.farmers.di;

import android.content.Context;
import com.hhg.farmers.service.telemetry.TelemetryDb;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast",
    "deprecation"
})
public final class AppModule_ProvideTelemetryDbFactory implements Factory<TelemetryDb> {
  private final Provider<Context> contextProvider;

  public AppModule_ProvideTelemetryDbFactory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public TelemetryDb get() {
    return provideTelemetryDb(contextProvider.get());
  }

  public static AppModule_ProvideTelemetryDbFactory create(Provider<Context> contextProvider) {
    return new AppModule_ProvideTelemetryDbFactory(contextProvider);
  }

  public static TelemetryDb provideTelemetryDb(Context context) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideTelemetryDb(context));
  }
}

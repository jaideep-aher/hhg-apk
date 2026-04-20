package com.hhg.farmers.di;

import android.content.Context;
import com.hhg.farmers.service.offline.OfflineCacheDb;
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
public final class AppModule_ProvideOfflineCacheDbFactory implements Factory<OfflineCacheDb> {
  private final Provider<Context> contextProvider;

  public AppModule_ProvideOfflineCacheDbFactory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public OfflineCacheDb get() {
    return provideOfflineCacheDb(contextProvider.get());
  }

  public static AppModule_ProvideOfflineCacheDbFactory create(Provider<Context> contextProvider) {
    return new AppModule_ProvideOfflineCacheDbFactory(contextProvider);
  }

  public static OfflineCacheDb provideOfflineCacheDb(Context context) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideOfflineCacheDb(context));
  }
}

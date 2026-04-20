package com.hhg.farmers.service.deviceinfo;

import android.content.Context;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class DeviceInfoCollector_Factory implements Factory<DeviceInfoCollector> {
  private final Provider<Context> contextProvider;

  public DeviceInfoCollector_Factory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public DeviceInfoCollector get() {
    return newInstance(contextProvider.get());
  }

  public static DeviceInfoCollector_Factory create(Provider<Context> contextProvider) {
    return new DeviceInfoCollector_Factory(contextProvider);
  }

  public static DeviceInfoCollector newInstance(Context context) {
    return new DeviceInfoCollector(context);
  }
}

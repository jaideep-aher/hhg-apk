package com.hhg.farmers;

import com.hhg.farmers.service.telemetry.TelemetryManager;
import com.hhg.farmers.service.update.UpdateManager;
import dagger.MembersInjector;
import dagger.internal.DaggerGenerated;
import dagger.internal.InjectedFieldSignature;
import dagger.internal.QualifierMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@QualifierMetadata
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
public final class MainActivity_MembersInjector implements MembersInjector<MainActivity> {
  private final Provider<UpdateManager> updateManagerProvider;

  private final Provider<TelemetryManager> telemetryProvider;

  public MainActivity_MembersInjector(Provider<UpdateManager> updateManagerProvider,
      Provider<TelemetryManager> telemetryProvider) {
    this.updateManagerProvider = updateManagerProvider;
    this.telemetryProvider = telemetryProvider;
  }

  public static MembersInjector<MainActivity> create(Provider<UpdateManager> updateManagerProvider,
      Provider<TelemetryManager> telemetryProvider) {
    return new MainActivity_MembersInjector(updateManagerProvider, telemetryProvider);
  }

  @Override
  public void injectMembers(MainActivity instance) {
    injectUpdateManager(instance, updateManagerProvider.get());
    injectTelemetry(instance, telemetryProvider.get());
  }

  @InjectedFieldSignature("com.hhg.farmers.MainActivity.updateManager")
  public static void injectUpdateManager(MainActivity instance, UpdateManager updateManager) {
    instance.updateManager = updateManager;
  }

  @InjectedFieldSignature("com.hhg.farmers.MainActivity.telemetry")
  public static void injectTelemetry(MainActivity instance, TelemetryManager telemetry) {
    instance.telemetry = telemetry;
  }
}

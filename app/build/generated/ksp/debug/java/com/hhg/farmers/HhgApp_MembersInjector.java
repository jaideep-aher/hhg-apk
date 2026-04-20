package com.hhg.farmers;

import androidx.hilt.work.HiltWorkerFactory;
import com.hhg.farmers.service.telemetry.TelemetryManager;
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
public final class HhgApp_MembersInjector implements MembersInjector<HhgApp> {
  private final Provider<HiltWorkerFactory> workerFactoryProvider;

  private final Provider<TelemetryManager> telemetryProvider;

  public HhgApp_MembersInjector(Provider<HiltWorkerFactory> workerFactoryProvider,
      Provider<TelemetryManager> telemetryProvider) {
    this.workerFactoryProvider = workerFactoryProvider;
    this.telemetryProvider = telemetryProvider;
  }

  public static MembersInjector<HhgApp> create(Provider<HiltWorkerFactory> workerFactoryProvider,
      Provider<TelemetryManager> telemetryProvider) {
    return new HhgApp_MembersInjector(workerFactoryProvider, telemetryProvider);
  }

  @Override
  public void injectMembers(HhgApp instance) {
    injectWorkerFactory(instance, workerFactoryProvider.get());
    injectTelemetry(instance, telemetryProvider.get());
  }

  @InjectedFieldSignature("com.hhg.farmers.HhgApp.workerFactory")
  public static void injectWorkerFactory(HhgApp instance, HiltWorkerFactory workerFactory) {
    instance.workerFactory = workerFactory;
  }

  @InjectedFieldSignature("com.hhg.farmers.HhgApp.telemetry")
  public static void injectTelemetry(HhgApp instance, TelemetryManager telemetry) {
    instance.telemetry = telemetry;
  }
}

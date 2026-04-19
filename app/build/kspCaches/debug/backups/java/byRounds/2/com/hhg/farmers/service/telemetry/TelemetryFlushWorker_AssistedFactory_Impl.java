package com.hhg.farmers.service.telemetry;

import android.content.Context;
import androidx.work.WorkerParameters;
import dagger.internal.DaggerGenerated;
import dagger.internal.InstanceFactory;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class TelemetryFlushWorker_AssistedFactory_Impl implements TelemetryFlushWorker_AssistedFactory {
  private final TelemetryFlushWorker_Factory delegateFactory;

  TelemetryFlushWorker_AssistedFactory_Impl(TelemetryFlushWorker_Factory delegateFactory) {
    this.delegateFactory = delegateFactory;
  }

  @Override
  public TelemetryFlushWorker create(Context p0, WorkerParameters p1) {
    return delegateFactory.get(p0, p1);
  }

  public static Provider<TelemetryFlushWorker_AssistedFactory> create(
      TelemetryFlushWorker_Factory delegateFactory) {
    return InstanceFactory.create(new TelemetryFlushWorker_AssistedFactory_Impl(delegateFactory));
  }

  public static dagger.internal.Provider<TelemetryFlushWorker_AssistedFactory> createFactoryProvider(
      TelemetryFlushWorker_Factory delegateFactory) {
    return InstanceFactory.create(new TelemetryFlushWorker_AssistedFactory_Impl(delegateFactory));
  }
}

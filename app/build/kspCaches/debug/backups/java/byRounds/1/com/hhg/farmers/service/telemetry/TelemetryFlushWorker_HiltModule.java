package com.hhg.farmers.service.telemetry;

import androidx.hilt.work.WorkerAssistedFactory;
import androidx.work.ListenableWorker;
import dagger.Binds;
import dagger.Module;
import dagger.hilt.InstallIn;
import dagger.hilt.codegen.OriginatingElement;
import dagger.hilt.components.SingletonComponent;
import dagger.multibindings.IntoMap;
import dagger.multibindings.StringKey;
import javax.annotation.processing.Generated;

@Generated("androidx.hilt.AndroidXHiltProcessor")
@Module
@InstallIn(SingletonComponent.class)
@OriginatingElement(
    topLevelClass = TelemetryFlushWorker.class
)
public interface TelemetryFlushWorker_HiltModule {
  @Binds
  @IntoMap
  @StringKey("com.hhg.farmers.service.telemetry.TelemetryFlushWorker")
  WorkerAssistedFactory<? extends ListenableWorker> bind(
      TelemetryFlushWorker_AssistedFactory factory);
}

package com.hhg.farmers.service.telemetry;

import android.content.Context;
import androidx.work.WorkerParameters;
import dagger.internal.DaggerGenerated;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
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
public final class TelemetryFlushWorker_Factory {
  private final Provider<TelemetryDb> dbProvider;

  public TelemetryFlushWorker_Factory(Provider<TelemetryDb> dbProvider) {
    this.dbProvider = dbProvider;
  }

  public TelemetryFlushWorker get(Context appContext, WorkerParameters params) {
    return newInstance(appContext, params, dbProvider.get());
  }

  public static TelemetryFlushWorker_Factory create(Provider<TelemetryDb> dbProvider) {
    return new TelemetryFlushWorker_Factory(dbProvider);
  }

  public static TelemetryFlushWorker newInstance(Context appContext, WorkerParameters params,
      TelemetryDb db) {
    return new TelemetryFlushWorker(appContext, params, db);
  }
}

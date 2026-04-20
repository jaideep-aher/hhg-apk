package com.hhg.farmers.service.telemetry;

import android.content.Context;
import com.hhg.farmers.data.session.SessionStore;
import com.hhg.farmers.service.deviceinfo.DeviceInfoCollector;
import com.hhg.farmers.service.deviceinfo.InstallReferrerProvider;
import com.hhg.farmers.service.deviceinfo.NetworkTypeProvider;
import com.squareup.moshi.Moshi;
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
public final class TelemetryManager_Factory implements Factory<TelemetryManager> {
  private final Provider<Context> contextProvider;

  private final Provider<TelemetryDb> dbProvider;

  private final Provider<SessionStore> sessionProvider;

  private final Provider<DeviceInfoCollector> deviceProvider;

  private final Provider<NetworkTypeProvider> networkProvider;

  private final Provider<InstallReferrerProvider> installReferrerProvider;

  private final Provider<Moshi> moshiProvider;

  public TelemetryManager_Factory(Provider<Context> contextProvider,
      Provider<TelemetryDb> dbProvider, Provider<SessionStore> sessionProvider,
      Provider<DeviceInfoCollector> deviceProvider, Provider<NetworkTypeProvider> networkProvider,
      Provider<InstallReferrerProvider> installReferrerProvider, Provider<Moshi> moshiProvider) {
    this.contextProvider = contextProvider;
    this.dbProvider = dbProvider;
    this.sessionProvider = sessionProvider;
    this.deviceProvider = deviceProvider;
    this.networkProvider = networkProvider;
    this.installReferrerProvider = installReferrerProvider;
    this.moshiProvider = moshiProvider;
  }

  @Override
  public TelemetryManager get() {
    return newInstance(contextProvider.get(), dbProvider.get(), sessionProvider.get(), deviceProvider.get(), networkProvider.get(), installReferrerProvider.get(), moshiProvider.get());
  }

  public static TelemetryManager_Factory create(Provider<Context> contextProvider,
      Provider<TelemetryDb> dbProvider, Provider<SessionStore> sessionProvider,
      Provider<DeviceInfoCollector> deviceProvider, Provider<NetworkTypeProvider> networkProvider,
      Provider<InstallReferrerProvider> installReferrerProvider, Provider<Moshi> moshiProvider) {
    return new TelemetryManager_Factory(contextProvider, dbProvider, sessionProvider, deviceProvider, networkProvider, installReferrerProvider, moshiProvider);
  }

  public static TelemetryManager newInstance(Context context, TelemetryDb db, SessionStore session,
      DeviceInfoCollector device, NetworkTypeProvider network,
      InstallReferrerProvider installReferrer, Moshi moshi) {
    return new TelemetryManager(context, db, session, device, network, installReferrer, moshi);
  }
}

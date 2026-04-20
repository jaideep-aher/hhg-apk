package com.hhg.farmers.ui.screens.farmer;

import com.hhg.farmers.data.auth.AuthRepository;
import com.hhg.farmers.data.repo.FarmerRepository;
import com.hhg.farmers.service.location.LocationProvider;
import com.hhg.farmers.service.offline.OfflineCache;
import com.hhg.farmers.service.share.PdfExporter;
import com.hhg.farmers.service.telemetry.TelemetryManager;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class FarmerDashboardViewModel_Factory implements Factory<FarmerDashboardViewModel> {
  private final Provider<FarmerRepository> farmerRepoProvider;

  private final Provider<AuthRepository> authProvider;

  private final Provider<OfflineCache> offlineCacheProvider;

  private final Provider<PdfExporter> pdfExporterProvider;

  private final Provider<LocationProvider> locationProvider;

  private final Provider<TelemetryManager> telemetryProvider;

  public FarmerDashboardViewModel_Factory(Provider<FarmerRepository> farmerRepoProvider,
      Provider<AuthRepository> authProvider, Provider<OfflineCache> offlineCacheProvider,
      Provider<PdfExporter> pdfExporterProvider, Provider<LocationProvider> locationProvider,
      Provider<TelemetryManager> telemetryProvider) {
    this.farmerRepoProvider = farmerRepoProvider;
    this.authProvider = authProvider;
    this.offlineCacheProvider = offlineCacheProvider;
    this.pdfExporterProvider = pdfExporterProvider;
    this.locationProvider = locationProvider;
    this.telemetryProvider = telemetryProvider;
  }

  @Override
  public FarmerDashboardViewModel get() {
    return newInstance(farmerRepoProvider.get(), authProvider.get(), offlineCacheProvider.get(), pdfExporterProvider.get(), locationProvider.get(), telemetryProvider.get());
  }

  public static FarmerDashboardViewModel_Factory create(
      Provider<FarmerRepository> farmerRepoProvider, Provider<AuthRepository> authProvider,
      Provider<OfflineCache> offlineCacheProvider, Provider<PdfExporter> pdfExporterProvider,
      Provider<LocationProvider> locationProvider, Provider<TelemetryManager> telemetryProvider) {
    return new FarmerDashboardViewModel_Factory(farmerRepoProvider, authProvider, offlineCacheProvider, pdfExporterProvider, locationProvider, telemetryProvider);
  }

  public static FarmerDashboardViewModel newInstance(FarmerRepository farmerRepo,
      AuthRepository auth, OfflineCache offlineCache, PdfExporter pdfExporter,
      LocationProvider location, TelemetryManager telemetry) {
    return new FarmerDashboardViewModel(farmerRepo, auth, offlineCache, pdfExporter, location, telemetry);
  }
}

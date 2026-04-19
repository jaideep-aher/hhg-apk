package com.hhg.farmers.ui.screens.marketrate;

import com.hhg.farmers.data.repo.FarmerRepository;
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
public final class HundekariRatesViewModel_Factory implements Factory<HundekariRatesViewModel> {
  private final Provider<FarmerRepository> farmerRepoProvider;

  private final Provider<TelemetryManager> telemetryProvider;

  public HundekariRatesViewModel_Factory(Provider<FarmerRepository> farmerRepoProvider,
      Provider<TelemetryManager> telemetryProvider) {
    this.farmerRepoProvider = farmerRepoProvider;
    this.telemetryProvider = telemetryProvider;
  }

  @Override
  public HundekariRatesViewModel get() {
    return newInstance(farmerRepoProvider.get(), telemetryProvider.get());
  }

  public static HundekariRatesViewModel_Factory create(
      Provider<FarmerRepository> farmerRepoProvider, Provider<TelemetryManager> telemetryProvider) {
    return new HundekariRatesViewModel_Factory(farmerRepoProvider, telemetryProvider);
  }

  public static HundekariRatesViewModel newInstance(FarmerRepository farmerRepo,
      TelemetryManager telemetry) {
    return new HundekariRatesViewModel(farmerRepo, telemetry);
  }
}

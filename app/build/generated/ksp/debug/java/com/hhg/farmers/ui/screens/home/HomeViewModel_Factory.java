package com.hhg.farmers.ui.screens.home;

import com.hhg.farmers.data.auth.AuthRepository;
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
public final class HomeViewModel_Factory implements Factory<HomeViewModel> {
  private final Provider<AuthRepository> authProvider;

  private final Provider<FarmerRepository> farmerRepoProvider;

  private final Provider<TelemetryManager> telemetryProvider;

  public HomeViewModel_Factory(Provider<AuthRepository> authProvider,
      Provider<FarmerRepository> farmerRepoProvider, Provider<TelemetryManager> telemetryProvider) {
    this.authProvider = authProvider;
    this.farmerRepoProvider = farmerRepoProvider;
    this.telemetryProvider = telemetryProvider;
  }

  @Override
  public HomeViewModel get() {
    return newInstance(authProvider.get(), farmerRepoProvider.get(), telemetryProvider.get());
  }

  public static HomeViewModel_Factory create(Provider<AuthRepository> authProvider,
      Provider<FarmerRepository> farmerRepoProvider, Provider<TelemetryManager> telemetryProvider) {
    return new HomeViewModel_Factory(authProvider, farmerRepoProvider, telemetryProvider);
  }

  public static HomeViewModel newInstance(AuthRepository auth, FarmerRepository farmerRepo,
      TelemetryManager telemetry) {
    return new HomeViewModel(auth, farmerRepo, telemetry);
  }
}

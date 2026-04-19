package com.hhg.farmers.di;

import com.hhg.farmers.data.repo.FarmerRepository;
import com.hhg.farmers.data.repo.MockFarmerRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
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
public final class RepositoryModule_ProvideFarmerRepositoryFactory implements Factory<FarmerRepository> {
  private final Provider<MockFarmerRepository> mockProvider;

  public RepositoryModule_ProvideFarmerRepositoryFactory(
      Provider<MockFarmerRepository> mockProvider) {
    this.mockProvider = mockProvider;
  }

  @Override
  public FarmerRepository get() {
    return provideFarmerRepository(mockProvider.get());
  }

  public static RepositoryModule_ProvideFarmerRepositoryFactory create(
      Provider<MockFarmerRepository> mockProvider) {
    return new RepositoryModule_ProvideFarmerRepositoryFactory(mockProvider);
  }

  public static FarmerRepository provideFarmerRepository(MockFarmerRepository mock) {
    return Preconditions.checkNotNullFromProvides(RepositoryModule.INSTANCE.provideFarmerRepository(mock));
  }
}

package com.hhg.farmers.data.auth;

import com.hhg.farmers.data.repo.FarmerRepository;
import com.hhg.farmers.data.session.SessionStore;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class UidAuthRepository_Factory implements Factory<UidAuthRepository> {
  private final Provider<FarmerRepository> farmerRepoProvider;

  private final Provider<SessionStore> sessionProvider;

  public UidAuthRepository_Factory(Provider<FarmerRepository> farmerRepoProvider,
      Provider<SessionStore> sessionProvider) {
    this.farmerRepoProvider = farmerRepoProvider;
    this.sessionProvider = sessionProvider;
  }

  @Override
  public UidAuthRepository get() {
    return newInstance(farmerRepoProvider.get(), sessionProvider.get());
  }

  public static UidAuthRepository_Factory create(Provider<FarmerRepository> farmerRepoProvider,
      Provider<SessionStore> sessionProvider) {
    return new UidAuthRepository_Factory(farmerRepoProvider, sessionProvider);
  }

  public static UidAuthRepository newInstance(FarmerRepository farmerRepo, SessionStore session) {
    return new UidAuthRepository(farmerRepo, session);
  }
}

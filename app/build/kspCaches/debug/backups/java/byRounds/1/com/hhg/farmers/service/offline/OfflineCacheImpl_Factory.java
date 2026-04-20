package com.hhg.farmers.service.offline;

import com.squareup.moshi.Moshi;
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
public final class OfflineCacheImpl_Factory implements Factory<OfflineCacheImpl> {
  private final Provider<OfflineCacheDb> dbProvider;

  private final Provider<Moshi> moshiProvider;

  public OfflineCacheImpl_Factory(Provider<OfflineCacheDb> dbProvider,
      Provider<Moshi> moshiProvider) {
    this.dbProvider = dbProvider;
    this.moshiProvider = moshiProvider;
  }

  @Override
  public OfflineCacheImpl get() {
    return newInstance(dbProvider.get(), moshiProvider.get());
  }

  public static OfflineCacheImpl_Factory create(Provider<OfflineCacheDb> dbProvider,
      Provider<Moshi> moshiProvider) {
    return new OfflineCacheImpl_Factory(dbProvider, moshiProvider);
  }

  public static OfflineCacheImpl newInstance(OfflineCacheDb db, Moshi moshi) {
    return new OfflineCacheImpl(db, moshi);
  }
}

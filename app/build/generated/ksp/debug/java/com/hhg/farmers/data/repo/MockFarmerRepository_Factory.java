package com.hhg.farmers.data.repo;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;

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
public final class MockFarmerRepository_Factory implements Factory<MockFarmerRepository> {
  @Override
  public MockFarmerRepository get() {
    return newInstance();
  }

  public static MockFarmerRepository_Factory create() {
    return InstanceHolder.INSTANCE;
  }

  public static MockFarmerRepository newInstance() {
    return new MockFarmerRepository();
  }

  private static final class InstanceHolder {
    private static final MockFarmerRepository_Factory INSTANCE = new MockFarmerRepository_Factory();
  }
}

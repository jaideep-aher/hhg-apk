package com.hhg.farmers.service.update;

import android.content.Context;
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
public final class UpdateManager_Factory implements Factory<UpdateManager> {
  private final Provider<Context> contextProvider;

  public UpdateManager_Factory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public UpdateManager get() {
    return newInstance(contextProvider.get());
  }

  public static UpdateManager_Factory create(Provider<Context> contextProvider) {
    return new UpdateManager_Factory(contextProvider);
  }

  public static UpdateManager newInstance(Context context) {
    return new UpdateManager(context);
  }
}

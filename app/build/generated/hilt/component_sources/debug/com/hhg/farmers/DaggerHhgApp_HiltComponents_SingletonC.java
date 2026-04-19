package com.hhg.farmers;

import android.app.Activity;
import android.app.Service;
import android.content.Context;
import android.view.View;
import androidx.fragment.app.Fragment;
import androidx.hilt.work.HiltWorkerFactory;
import androidx.hilt.work.WorkerAssistedFactory;
import androidx.hilt.work.WorkerFactoryModule_ProvideFactoryFactory;
import androidx.lifecycle.SavedStateHandle;
import androidx.lifecycle.ViewModel;
import androidx.work.ListenableWorker;
import androidx.work.WorkerParameters;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import com.google.errorprone.annotations.CanIgnoreReturnValue;
import com.hhg.farmers.data.auth.UidAuthRepository;
import com.hhg.farmers.data.repo.FarmerRepository;
import com.hhg.farmers.data.repo.MockFarmerRepository;
import com.hhg.farmers.data.session.SessionStore;
import com.hhg.farmers.di.AppModule_ProvideMoshiFactory;
import com.hhg.farmers.di.AppModule_ProvideOfflineCacheDbFactory;
import com.hhg.farmers.di.AppModule_ProvideTelemetryDbFactory;
import com.hhg.farmers.di.RepositoryModule_ProvideFarmerRepositoryFactory;
import com.hhg.farmers.service.deviceinfo.DeviceInfoCollector;
import com.hhg.farmers.service.deviceinfo.InstallReferrerProvider;
import com.hhg.farmers.service.deviceinfo.NetworkTypeProvider;
import com.hhg.farmers.service.location.LocationProvider;
import com.hhg.farmers.service.offline.OfflineCacheDb;
import com.hhg.farmers.service.offline.OfflineCacheImpl;
import com.hhg.farmers.service.share.PdfExporter;
import com.hhg.farmers.service.telemetry.TelemetryDb;
import com.hhg.farmers.service.telemetry.TelemetryFlushWorker;
import com.hhg.farmers.service.telemetry.TelemetryFlushWorker_AssistedFactory;
import com.hhg.farmers.service.telemetry.TelemetryManager;
import com.hhg.farmers.service.update.UpdateManager;
import com.hhg.farmers.ui.screens.farmer.FarmerDashboardViewModel;
import com.hhg.farmers.ui.screens.farmer.FarmerDashboardViewModel_HiltModules;
import com.hhg.farmers.ui.screens.home.HomeViewModel;
import com.hhg.farmers.ui.screens.home.HomeViewModel_HiltModules;
import com.hhg.farmers.ui.screens.marketrate.HundekariRatesViewModel;
import com.hhg.farmers.ui.screens.marketrate.HundekariRatesViewModel_HiltModules;
import com.squareup.moshi.Moshi;
import dagger.hilt.android.ActivityRetainedLifecycle;
import dagger.hilt.android.ViewModelLifecycle;
import dagger.hilt.android.internal.builders.ActivityComponentBuilder;
import dagger.hilt.android.internal.builders.ActivityRetainedComponentBuilder;
import dagger.hilt.android.internal.builders.FragmentComponentBuilder;
import dagger.hilt.android.internal.builders.ServiceComponentBuilder;
import dagger.hilt.android.internal.builders.ViewComponentBuilder;
import dagger.hilt.android.internal.builders.ViewModelComponentBuilder;
import dagger.hilt.android.internal.builders.ViewWithFragmentComponentBuilder;
import dagger.hilt.android.internal.lifecycle.DefaultViewModelFactories;
import dagger.hilt.android.internal.lifecycle.DefaultViewModelFactories_InternalFactoryFactory_Factory;
import dagger.hilt.android.internal.managers.ActivityRetainedComponentManager_LifecycleModule_ProvideActivityRetainedLifecycleFactory;
import dagger.hilt.android.internal.managers.SavedStateHandleHolder;
import dagger.hilt.android.internal.modules.ApplicationContextModule;
import dagger.hilt.android.internal.modules.ApplicationContextModule_ProvideContextFactory;
import dagger.internal.DaggerGenerated;
import dagger.internal.DoubleCheck;
import dagger.internal.IdentifierNameString;
import dagger.internal.KeepFieldType;
import dagger.internal.LazyClassKeyMap;
import dagger.internal.Preconditions;
import dagger.internal.Provider;
import dagger.internal.SingleCheck;
import java.util.Map;
import java.util.Set;
import javax.annotation.processing.Generated;

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
public final class DaggerHhgApp_HiltComponents_SingletonC {
  private DaggerHhgApp_HiltComponents_SingletonC() {
  }

  public static Builder builder() {
    return new Builder();
  }

  public static final class Builder {
    private ApplicationContextModule applicationContextModule;

    private Builder() {
    }

    public Builder applicationContextModule(ApplicationContextModule applicationContextModule) {
      this.applicationContextModule = Preconditions.checkNotNull(applicationContextModule);
      return this;
    }

    public HhgApp_HiltComponents.SingletonC build() {
      Preconditions.checkBuilderRequirement(applicationContextModule, ApplicationContextModule.class);
      return new SingletonCImpl(applicationContextModule);
    }
  }

  private static final class ActivityRetainedCBuilder implements HhgApp_HiltComponents.ActivityRetainedC.Builder {
    private final SingletonCImpl singletonCImpl;

    private SavedStateHandleHolder savedStateHandleHolder;

    private ActivityRetainedCBuilder(SingletonCImpl singletonCImpl) {
      this.singletonCImpl = singletonCImpl;
    }

    @Override
    public ActivityRetainedCBuilder savedStateHandleHolder(
        SavedStateHandleHolder savedStateHandleHolder) {
      this.savedStateHandleHolder = Preconditions.checkNotNull(savedStateHandleHolder);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ActivityRetainedC build() {
      Preconditions.checkBuilderRequirement(savedStateHandleHolder, SavedStateHandleHolder.class);
      return new ActivityRetainedCImpl(singletonCImpl, savedStateHandleHolder);
    }
  }

  private static final class ActivityCBuilder implements HhgApp_HiltComponents.ActivityC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private Activity activity;

    private ActivityCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
    }

    @Override
    public ActivityCBuilder activity(Activity activity) {
      this.activity = Preconditions.checkNotNull(activity);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ActivityC build() {
      Preconditions.checkBuilderRequirement(activity, Activity.class);
      return new ActivityCImpl(singletonCImpl, activityRetainedCImpl, activity);
    }
  }

  private static final class FragmentCBuilder implements HhgApp_HiltComponents.FragmentC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private Fragment fragment;

    private FragmentCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
    }

    @Override
    public FragmentCBuilder fragment(Fragment fragment) {
      this.fragment = Preconditions.checkNotNull(fragment);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.FragmentC build() {
      Preconditions.checkBuilderRequirement(fragment, Fragment.class);
      return new FragmentCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, fragment);
    }
  }

  private static final class ViewWithFragmentCBuilder implements HhgApp_HiltComponents.ViewWithFragmentC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl;

    private View view;

    private ViewWithFragmentCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        FragmentCImpl fragmentCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
      this.fragmentCImpl = fragmentCImpl;
    }

    @Override
    public ViewWithFragmentCBuilder view(View view) {
      this.view = Preconditions.checkNotNull(view);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ViewWithFragmentC build() {
      Preconditions.checkBuilderRequirement(view, View.class);
      return new ViewWithFragmentCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, fragmentCImpl, view);
    }
  }

  private static final class ViewCBuilder implements HhgApp_HiltComponents.ViewC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private View view;

    private ViewCBuilder(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
        ActivityCImpl activityCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
    }

    @Override
    public ViewCBuilder view(View view) {
      this.view = Preconditions.checkNotNull(view);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ViewC build() {
      Preconditions.checkBuilderRequirement(view, View.class);
      return new ViewCImpl(singletonCImpl, activityRetainedCImpl, activityCImpl, view);
    }
  }

  private static final class ViewModelCBuilder implements HhgApp_HiltComponents.ViewModelC.Builder {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private SavedStateHandle savedStateHandle;

    private ViewModelLifecycle viewModelLifecycle;

    private ViewModelCBuilder(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
    }

    @Override
    public ViewModelCBuilder savedStateHandle(SavedStateHandle handle) {
      this.savedStateHandle = Preconditions.checkNotNull(handle);
      return this;
    }

    @Override
    public ViewModelCBuilder viewModelLifecycle(ViewModelLifecycle viewModelLifecycle) {
      this.viewModelLifecycle = Preconditions.checkNotNull(viewModelLifecycle);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ViewModelC build() {
      Preconditions.checkBuilderRequirement(savedStateHandle, SavedStateHandle.class);
      Preconditions.checkBuilderRequirement(viewModelLifecycle, ViewModelLifecycle.class);
      return new ViewModelCImpl(singletonCImpl, activityRetainedCImpl, savedStateHandle, viewModelLifecycle);
    }
  }

  private static final class ServiceCBuilder implements HhgApp_HiltComponents.ServiceC.Builder {
    private final SingletonCImpl singletonCImpl;

    private Service service;

    private ServiceCBuilder(SingletonCImpl singletonCImpl) {
      this.singletonCImpl = singletonCImpl;
    }

    @Override
    public ServiceCBuilder service(Service service) {
      this.service = Preconditions.checkNotNull(service);
      return this;
    }

    @Override
    public HhgApp_HiltComponents.ServiceC build() {
      Preconditions.checkBuilderRequirement(service, Service.class);
      return new ServiceCImpl(singletonCImpl, service);
    }
  }

  private static final class ViewWithFragmentCImpl extends HhgApp_HiltComponents.ViewWithFragmentC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl;

    private final ViewWithFragmentCImpl viewWithFragmentCImpl = this;

    private ViewWithFragmentCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        FragmentCImpl fragmentCImpl, View viewParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;
      this.fragmentCImpl = fragmentCImpl;


    }
  }

  private static final class FragmentCImpl extends HhgApp_HiltComponents.FragmentC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final FragmentCImpl fragmentCImpl = this;

    private FragmentCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, ActivityCImpl activityCImpl,
        Fragment fragmentParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;


    }

    @Override
    public DefaultViewModelFactories.InternalFactoryFactory getHiltInternalFactoryFactory() {
      return activityCImpl.getHiltInternalFactoryFactory();
    }

    @Override
    public ViewWithFragmentComponentBuilder viewWithFragmentComponentBuilder() {
      return new ViewWithFragmentCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl, fragmentCImpl);
    }
  }

  private static final class ViewCImpl extends HhgApp_HiltComponents.ViewC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl;

    private final ViewCImpl viewCImpl = this;

    private ViewCImpl(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
        ActivityCImpl activityCImpl, View viewParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;
      this.activityCImpl = activityCImpl;


    }
  }

  private static final class ActivityCImpl extends HhgApp_HiltComponents.ActivityC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ActivityCImpl activityCImpl = this;

    private ActivityCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, Activity activityParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;


    }

    @Override
    public void injectMainActivity(MainActivity mainActivity) {
      injectMainActivity2(mainActivity);
    }

    @Override
    public DefaultViewModelFactories.InternalFactoryFactory getHiltInternalFactoryFactory() {
      return DefaultViewModelFactories_InternalFactoryFactory_Factory.newInstance(getViewModelKeys(), new ViewModelCBuilder(singletonCImpl, activityRetainedCImpl));
    }

    @Override
    public Map<Class<?>, Boolean> getViewModelKeys() {
      return LazyClassKeyMap.<Boolean>of(ImmutableMap.<String, Boolean>of(LazyClassKeyProvider.com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel, FarmerDashboardViewModel_HiltModules.KeyModule.provide(), LazyClassKeyProvider.com_hhg_farmers_ui_screens_home_HomeViewModel, HomeViewModel_HiltModules.KeyModule.provide(), LazyClassKeyProvider.com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel, HundekariRatesViewModel_HiltModules.KeyModule.provide()));
    }

    @Override
    public ViewModelComponentBuilder getViewModelComponentBuilder() {
      return new ViewModelCBuilder(singletonCImpl, activityRetainedCImpl);
    }

    @Override
    public FragmentComponentBuilder fragmentComponentBuilder() {
      return new FragmentCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl);
    }

    @Override
    public ViewComponentBuilder viewComponentBuilder() {
      return new ViewCBuilder(singletonCImpl, activityRetainedCImpl, activityCImpl);
    }

    @CanIgnoreReturnValue
    private MainActivity injectMainActivity2(MainActivity instance) {
      MainActivity_MembersInjector.injectUpdateManager(instance, singletonCImpl.updateManagerProvider.get());
      MainActivity_MembersInjector.injectTelemetry(instance, singletonCImpl.telemetryManagerProvider.get());
      return instance;
    }

    @IdentifierNameString
    private static final class LazyClassKeyProvider {
      static String com_hhg_farmers_ui_screens_home_HomeViewModel = "com.hhg.farmers.ui.screens.home.HomeViewModel";

      static String com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel = "com.hhg.farmers.ui.screens.farmer.FarmerDashboardViewModel";

      static String com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel = "com.hhg.farmers.ui.screens.marketrate.HundekariRatesViewModel";

      @KeepFieldType
      HomeViewModel com_hhg_farmers_ui_screens_home_HomeViewModel2;

      @KeepFieldType
      FarmerDashboardViewModel com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel2;

      @KeepFieldType
      HundekariRatesViewModel com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel2;
    }
  }

  private static final class ViewModelCImpl extends HhgApp_HiltComponents.ViewModelC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl;

    private final ViewModelCImpl viewModelCImpl = this;

    private Provider<FarmerDashboardViewModel> farmerDashboardViewModelProvider;

    private Provider<HomeViewModel> homeViewModelProvider;

    private Provider<HundekariRatesViewModel> hundekariRatesViewModelProvider;

    private ViewModelCImpl(SingletonCImpl singletonCImpl,
        ActivityRetainedCImpl activityRetainedCImpl, SavedStateHandle savedStateHandleParam,
        ViewModelLifecycle viewModelLifecycleParam) {
      this.singletonCImpl = singletonCImpl;
      this.activityRetainedCImpl = activityRetainedCImpl;

      initialize(savedStateHandleParam, viewModelLifecycleParam);

    }

    @SuppressWarnings("unchecked")
    private void initialize(final SavedStateHandle savedStateHandleParam,
        final ViewModelLifecycle viewModelLifecycleParam) {
      this.farmerDashboardViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 0);
      this.homeViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 1);
      this.hundekariRatesViewModelProvider = new SwitchingProvider<>(singletonCImpl, activityRetainedCImpl, viewModelCImpl, 2);
    }

    @Override
    public Map<Class<?>, javax.inject.Provider<ViewModel>> getHiltViewModelMap() {
      return LazyClassKeyMap.<javax.inject.Provider<ViewModel>>of(ImmutableMap.<String, javax.inject.Provider<ViewModel>>of(LazyClassKeyProvider.com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel, ((Provider) farmerDashboardViewModelProvider), LazyClassKeyProvider.com_hhg_farmers_ui_screens_home_HomeViewModel, ((Provider) homeViewModelProvider), LazyClassKeyProvider.com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel, ((Provider) hundekariRatesViewModelProvider)));
    }

    @Override
    public Map<Class<?>, Object> getHiltViewModelAssistedMap() {
      return ImmutableMap.<Class<?>, Object>of();
    }

    @IdentifierNameString
    private static final class LazyClassKeyProvider {
      static String com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel = "com.hhg.farmers.ui.screens.marketrate.HundekariRatesViewModel";

      static String com_hhg_farmers_ui_screens_home_HomeViewModel = "com.hhg.farmers.ui.screens.home.HomeViewModel";

      static String com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel = "com.hhg.farmers.ui.screens.farmer.FarmerDashboardViewModel";

      @KeepFieldType
      HundekariRatesViewModel com_hhg_farmers_ui_screens_marketrate_HundekariRatesViewModel2;

      @KeepFieldType
      HomeViewModel com_hhg_farmers_ui_screens_home_HomeViewModel2;

      @KeepFieldType
      FarmerDashboardViewModel com_hhg_farmers_ui_screens_farmer_FarmerDashboardViewModel2;
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final ActivityRetainedCImpl activityRetainedCImpl;

      private final ViewModelCImpl viewModelCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
          ViewModelCImpl viewModelCImpl, int id) {
        this.singletonCImpl = singletonCImpl;
        this.activityRetainedCImpl = activityRetainedCImpl;
        this.viewModelCImpl = viewModelCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // com.hhg.farmers.ui.screens.farmer.FarmerDashboardViewModel 
          return (T) new FarmerDashboardViewModel(singletonCImpl.provideFarmerRepositoryProvider.get(), singletonCImpl.uidAuthRepositoryProvider.get(), singletonCImpl.offlineCacheImplProvider.get(), singletonCImpl.pdfExporterProvider.get(), singletonCImpl.locationProvider.get(), singletonCImpl.telemetryManagerProvider.get());

          case 1: // com.hhg.farmers.ui.screens.home.HomeViewModel 
          return (T) new HomeViewModel(singletonCImpl.uidAuthRepositoryProvider.get(), singletonCImpl.provideFarmerRepositoryProvider.get(), singletonCImpl.telemetryManagerProvider.get());

          case 2: // com.hhg.farmers.ui.screens.marketrate.HundekariRatesViewModel 
          return (T) new HundekariRatesViewModel(singletonCImpl.provideFarmerRepositoryProvider.get(), singletonCImpl.telemetryManagerProvider.get());

          default: throw new AssertionError(id);
        }
      }
    }
  }

  private static final class ActivityRetainedCImpl extends HhgApp_HiltComponents.ActivityRetainedC {
    private final SingletonCImpl singletonCImpl;

    private final ActivityRetainedCImpl activityRetainedCImpl = this;

    private Provider<ActivityRetainedLifecycle> provideActivityRetainedLifecycleProvider;

    private ActivityRetainedCImpl(SingletonCImpl singletonCImpl,
        SavedStateHandleHolder savedStateHandleHolderParam) {
      this.singletonCImpl = singletonCImpl;

      initialize(savedStateHandleHolderParam);

    }

    @SuppressWarnings("unchecked")
    private void initialize(final SavedStateHandleHolder savedStateHandleHolderParam) {
      this.provideActivityRetainedLifecycleProvider = DoubleCheck.provider(new SwitchingProvider<ActivityRetainedLifecycle>(singletonCImpl, activityRetainedCImpl, 0));
    }

    @Override
    public ActivityComponentBuilder activityComponentBuilder() {
      return new ActivityCBuilder(singletonCImpl, activityRetainedCImpl);
    }

    @Override
    public ActivityRetainedLifecycle getActivityRetainedLifecycle() {
      return provideActivityRetainedLifecycleProvider.get();
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final ActivityRetainedCImpl activityRetainedCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, ActivityRetainedCImpl activityRetainedCImpl,
          int id) {
        this.singletonCImpl = singletonCImpl;
        this.activityRetainedCImpl = activityRetainedCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // dagger.hilt.android.ActivityRetainedLifecycle 
          return (T) ActivityRetainedComponentManager_LifecycleModule_ProvideActivityRetainedLifecycleFactory.provideActivityRetainedLifecycle();

          default: throw new AssertionError(id);
        }
      }
    }
  }

  private static final class ServiceCImpl extends HhgApp_HiltComponents.ServiceC {
    private final SingletonCImpl singletonCImpl;

    private final ServiceCImpl serviceCImpl = this;

    private ServiceCImpl(SingletonCImpl singletonCImpl, Service serviceParam) {
      this.singletonCImpl = singletonCImpl;


    }
  }

  private static final class SingletonCImpl extends HhgApp_HiltComponents.SingletonC {
    private final ApplicationContextModule applicationContextModule;

    private final SingletonCImpl singletonCImpl = this;

    private Provider<TelemetryDb> provideTelemetryDbProvider;

    private Provider<TelemetryFlushWorker_AssistedFactory> telemetryFlushWorker_AssistedFactoryProvider;

    private Provider<SessionStore> sessionStoreProvider;

    private Provider<DeviceInfoCollector> deviceInfoCollectorProvider;

    private Provider<NetworkTypeProvider> networkTypeProvider;

    private Provider<InstallReferrerProvider> installReferrerProvider;

    private Provider<Moshi> provideMoshiProvider;

    private Provider<TelemetryManager> telemetryManagerProvider;

    private Provider<UpdateManager> updateManagerProvider;

    private Provider<MockFarmerRepository> mockFarmerRepositoryProvider;

    private Provider<FarmerRepository> provideFarmerRepositoryProvider;

    private Provider<UidAuthRepository> uidAuthRepositoryProvider;

    private Provider<OfflineCacheDb> provideOfflineCacheDbProvider;

    private Provider<OfflineCacheImpl> offlineCacheImplProvider;

    private Provider<PdfExporter> pdfExporterProvider;

    private Provider<LocationProvider> locationProvider;

    private SingletonCImpl(ApplicationContextModule applicationContextModuleParam) {
      this.applicationContextModule = applicationContextModuleParam;
      initialize(applicationContextModuleParam);

    }

    private Map<String, javax.inject.Provider<WorkerAssistedFactory<? extends ListenableWorker>>> mapOfStringAndProviderOfWorkerAssistedFactoryOf(
        ) {
      return ImmutableMap.<String, javax.inject.Provider<WorkerAssistedFactory<? extends ListenableWorker>>>of("com.hhg.farmers.service.telemetry.TelemetryFlushWorker", ((Provider) telemetryFlushWorker_AssistedFactoryProvider));
    }

    private HiltWorkerFactory hiltWorkerFactory() {
      return WorkerFactoryModule_ProvideFactoryFactory.provideFactory(mapOfStringAndProviderOfWorkerAssistedFactoryOf());
    }

    @SuppressWarnings("unchecked")
    private void initialize(final ApplicationContextModule applicationContextModuleParam) {
      this.provideTelemetryDbProvider = DoubleCheck.provider(new SwitchingProvider<TelemetryDb>(singletonCImpl, 1));
      this.telemetryFlushWorker_AssistedFactoryProvider = SingleCheck.provider(new SwitchingProvider<TelemetryFlushWorker_AssistedFactory>(singletonCImpl, 0));
      this.sessionStoreProvider = DoubleCheck.provider(new SwitchingProvider<SessionStore>(singletonCImpl, 3));
      this.deviceInfoCollectorProvider = DoubleCheck.provider(new SwitchingProvider<DeviceInfoCollector>(singletonCImpl, 4));
      this.networkTypeProvider = DoubleCheck.provider(new SwitchingProvider<NetworkTypeProvider>(singletonCImpl, 5));
      this.installReferrerProvider = DoubleCheck.provider(new SwitchingProvider<InstallReferrerProvider>(singletonCImpl, 6));
      this.provideMoshiProvider = DoubleCheck.provider(new SwitchingProvider<Moshi>(singletonCImpl, 7));
      this.telemetryManagerProvider = DoubleCheck.provider(new SwitchingProvider<TelemetryManager>(singletonCImpl, 2));
      this.updateManagerProvider = DoubleCheck.provider(new SwitchingProvider<UpdateManager>(singletonCImpl, 8));
      this.mockFarmerRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<MockFarmerRepository>(singletonCImpl, 10));
      this.provideFarmerRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<FarmerRepository>(singletonCImpl, 9));
      this.uidAuthRepositoryProvider = DoubleCheck.provider(new SwitchingProvider<UidAuthRepository>(singletonCImpl, 11));
      this.provideOfflineCacheDbProvider = DoubleCheck.provider(new SwitchingProvider<OfflineCacheDb>(singletonCImpl, 13));
      this.offlineCacheImplProvider = DoubleCheck.provider(new SwitchingProvider<OfflineCacheImpl>(singletonCImpl, 12));
      this.pdfExporterProvider = DoubleCheck.provider(new SwitchingProvider<PdfExporter>(singletonCImpl, 14));
      this.locationProvider = DoubleCheck.provider(new SwitchingProvider<LocationProvider>(singletonCImpl, 15));
    }

    @Override
    public void injectHhgApp(HhgApp hhgApp) {
      injectHhgApp2(hhgApp);
    }

    @Override
    public Set<Boolean> getDisableFragmentGetContextFix() {
      return ImmutableSet.<Boolean>of();
    }

    @Override
    public ActivityRetainedComponentBuilder retainedComponentBuilder() {
      return new ActivityRetainedCBuilder(singletonCImpl);
    }

    @Override
    public ServiceComponentBuilder serviceComponentBuilder() {
      return new ServiceCBuilder(singletonCImpl);
    }

    @CanIgnoreReturnValue
    private HhgApp injectHhgApp2(HhgApp instance) {
      HhgApp_MembersInjector.injectWorkerFactory(instance, hiltWorkerFactory());
      HhgApp_MembersInjector.injectTelemetry(instance, telemetryManagerProvider.get());
      return instance;
    }

    private static final class SwitchingProvider<T> implements Provider<T> {
      private final SingletonCImpl singletonCImpl;

      private final int id;

      SwitchingProvider(SingletonCImpl singletonCImpl, int id) {
        this.singletonCImpl = singletonCImpl;
        this.id = id;
      }

      @SuppressWarnings("unchecked")
      @Override
      public T get() {
        switch (id) {
          case 0: // com.hhg.farmers.service.telemetry.TelemetryFlushWorker_AssistedFactory 
          return (T) new TelemetryFlushWorker_AssistedFactory() {
            @Override
            public TelemetryFlushWorker create(Context appContext, WorkerParameters params) {
              return new TelemetryFlushWorker(appContext, params, singletonCImpl.provideTelemetryDbProvider.get());
            }
          };

          case 1: // com.hhg.farmers.service.telemetry.TelemetryDb 
          return (T) AppModule_ProvideTelemetryDbFactory.provideTelemetryDb(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 2: // com.hhg.farmers.service.telemetry.TelemetryManager 
          return (T) new TelemetryManager(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule), singletonCImpl.provideTelemetryDbProvider.get(), singletonCImpl.sessionStoreProvider.get(), singletonCImpl.deviceInfoCollectorProvider.get(), singletonCImpl.networkTypeProvider.get(), singletonCImpl.installReferrerProvider.get(), singletonCImpl.provideMoshiProvider.get());

          case 3: // com.hhg.farmers.data.session.SessionStore 
          return (T) new SessionStore(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 4: // com.hhg.farmers.service.deviceinfo.DeviceInfoCollector 
          return (T) new DeviceInfoCollector(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 5: // com.hhg.farmers.service.deviceinfo.NetworkTypeProvider 
          return (T) new NetworkTypeProvider(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 6: // com.hhg.farmers.service.deviceinfo.InstallReferrerProvider 
          return (T) new InstallReferrerProvider(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 7: // com.squareup.moshi.Moshi 
          return (T) AppModule_ProvideMoshiFactory.provideMoshi();

          case 8: // com.hhg.farmers.service.update.UpdateManager 
          return (T) new UpdateManager(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 9: // com.hhg.farmers.data.repo.FarmerRepository 
          return (T) RepositoryModule_ProvideFarmerRepositoryFactory.provideFarmerRepository(singletonCImpl.mockFarmerRepositoryProvider.get());

          case 10: // com.hhg.farmers.data.repo.MockFarmerRepository 
          return (T) new MockFarmerRepository();

          case 11: // com.hhg.farmers.data.auth.UidAuthRepository 
          return (T) new UidAuthRepository(singletonCImpl.provideFarmerRepositoryProvider.get(), singletonCImpl.sessionStoreProvider.get());

          case 12: // com.hhg.farmers.service.offline.OfflineCacheImpl 
          return (T) new OfflineCacheImpl(singletonCImpl.provideOfflineCacheDbProvider.get(), singletonCImpl.provideMoshiProvider.get());

          case 13: // com.hhg.farmers.service.offline.OfflineCacheDb 
          return (T) AppModule_ProvideOfflineCacheDbFactory.provideOfflineCacheDb(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 14: // com.hhg.farmers.service.share.PdfExporter 
          return (T) new PdfExporter(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          case 15: // com.hhg.farmers.service.location.LocationProvider 
          return (T) new LocationProvider(ApplicationContextModule_ProvideContextFactory.provideContext(singletonCImpl.applicationContextModule));

          default: throw new AssertionError(id);
        }
      }
    }
  }
}

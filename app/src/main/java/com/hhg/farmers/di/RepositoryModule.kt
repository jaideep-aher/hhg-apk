package com.hhg.farmers.di

import com.hhg.farmers.BuildConfig
import com.hhg.farmers.data.auth.AuthRepository
import com.hhg.farmers.data.auth.UidAuthRepository
import com.hhg.farmers.data.repo.FarmerRepository
import com.hhg.farmers.data.repo.MockFarmerRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Repository bindings. Today the mock is hardwired via `ENABLE_MOCK_REPO`.
 * To switch to the real HTTP repo, flip the flag in build.gradle.kts and provide a
 * `RetrofitFarmerRepository` implementation.
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides @Singleton
    fun provideFarmerRepository(
        mock: MockFarmerRepository
        // real: RetrofitFarmerRepository — add when backend REST endpoints exist
    ): FarmerRepository = if (BuildConfig.ENABLE_MOCK_REPO) mock else mock
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AuthBindings {
    @Binds @Singleton
    abstract fun bindAuthRepository(impl: UidAuthRepository): AuthRepository
}

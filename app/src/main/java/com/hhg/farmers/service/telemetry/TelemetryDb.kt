package com.hhg.farmers.service.telemetry

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [TelemetryEvent::class], version = 1, exportSchema = false)
abstract class TelemetryDb : RoomDatabase() {
    abstract fun events(): TelemetryDao

    companion object { const val NAME = "telemetry.db" }
}

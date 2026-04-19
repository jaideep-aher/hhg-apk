package com.hhg.farmers.service.offline;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class OfflineCacheDao_Impl implements OfflineCacheDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<CachedFarmerPage> __insertionAdapterOfCachedFarmerPage;

  private final SharedSQLiteStatement __preparedStmtOfPurgeOlderThan;

  public OfflineCacheDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfCachedFarmerPage = new EntityInsertionAdapter<CachedFarmerPage>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `cached_farmer_page` (`farmerUid`,`json`,`ts_ms`) VALUES (?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CachedFarmerPage entity) {
        statement.bindString(1, entity.getFarmerUid());
        statement.bindString(2, entity.getJson());
        statement.bindLong(3, entity.getTsEpochMs());
      }
    };
    this.__preparedStmtOfPurgeOlderThan = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM cached_farmer_page WHERE ts_ms < ?";
        return _query;
      }
    };
  }

  @Override
  public Object upsert(final CachedFarmerPage page, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCachedFarmerPage.insert(page);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object purgeOlderThan(final long olderThanMs,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfPurgeOlderThan.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, olderThanMs);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfPurgeOlderThan.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object get(final String uid, final Continuation<? super CachedFarmerPage> $completion) {
    final String _sql = "SELECT * FROM cached_farmer_page WHERE farmerUid = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, uid);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<CachedFarmerPage>() {
      @Override
      @Nullable
      public CachedFarmerPage call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfFarmerUid = CursorUtil.getColumnIndexOrThrow(_cursor, "farmerUid");
          final int _cursorIndexOfJson = CursorUtil.getColumnIndexOrThrow(_cursor, "json");
          final int _cursorIndexOfTsEpochMs = CursorUtil.getColumnIndexOrThrow(_cursor, "ts_ms");
          final CachedFarmerPage _result;
          if (_cursor.moveToFirst()) {
            final String _tmpFarmerUid;
            _tmpFarmerUid = _cursor.getString(_cursorIndexOfFarmerUid);
            final String _tmpJson;
            _tmpJson = _cursor.getString(_cursorIndexOfJson);
            final long _tmpTsEpochMs;
            _tmpTsEpochMs = _cursor.getLong(_cursorIndexOfTsEpochMs);
            _result = new CachedFarmerPage(_tmpFarmerUid,_tmpJson,_tmpTsEpochMs);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}

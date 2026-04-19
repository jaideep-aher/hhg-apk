package com.hhg.farmers.service.telemetry;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.room.util.StringUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Integer;
import java.lang.Long;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.StringBuilder;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class TelemetryDao_Impl implements TelemetryDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<TelemetryEvent> __insertionAdapterOfTelemetryEvent;

  private final SharedSQLiteStatement __preparedStmtOfPurgeOldFlushed;

  public TelemetryDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfTelemetryEvent = new EntityInsertionAdapter<TelemetryEvent>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR ABORT INTO `events` (`id`,`sessionId`,`farmerId`,`name`,`page`,`propsJson`,`tsEpochMs`,`flushed`) VALUES (nullif(?, 0),?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final TelemetryEvent entity) {
        statement.bindLong(1, entity.getId());
        statement.bindString(2, entity.getSessionId());
        if (entity.getFarmerId() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getFarmerId());
        }
        statement.bindString(4, entity.getName());
        if (entity.getPage() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getPage());
        }
        statement.bindString(6, entity.getPropsJson());
        statement.bindLong(7, entity.getTsEpochMs());
        final int _tmp = entity.getFlushed() ? 1 : 0;
        statement.bindLong(8, _tmp);
      }
    };
    this.__preparedStmtOfPurgeOldFlushed = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM events WHERE flushed = 1 AND tsEpochMs < ?";
        return _query;
      }
    };
  }

  @Override
  public Object insert(final TelemetryEvent event, final Continuation<? super Long> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Long>() {
      @Override
      @NonNull
      public Long call() throws Exception {
        __db.beginTransaction();
        try {
          final Long _result = __insertionAdapterOfTelemetryEvent.insertAndReturnId(event);
          __db.setTransactionSuccessful();
          return _result;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object purgeOldFlushed(final long olderThanMs,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfPurgeOldFlushed.acquire();
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
          __preparedStmtOfPurgeOldFlushed.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object pendingBatch(final int limit,
      final Continuation<? super List<TelemetryEvent>> $completion) {
    final String _sql = "SELECT * FROM events WHERE flushed = 0 ORDER BY tsEpochMs ASC LIMIT ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindLong(_argIndex, limit);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<TelemetryEvent>>() {
      @Override
      @NonNull
      public List<TelemetryEvent> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfSessionId = CursorUtil.getColumnIndexOrThrow(_cursor, "sessionId");
          final int _cursorIndexOfFarmerId = CursorUtil.getColumnIndexOrThrow(_cursor, "farmerId");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfPage = CursorUtil.getColumnIndexOrThrow(_cursor, "page");
          final int _cursorIndexOfPropsJson = CursorUtil.getColumnIndexOrThrow(_cursor, "propsJson");
          final int _cursorIndexOfTsEpochMs = CursorUtil.getColumnIndexOrThrow(_cursor, "tsEpochMs");
          final int _cursorIndexOfFlushed = CursorUtil.getColumnIndexOrThrow(_cursor, "flushed");
          final List<TelemetryEvent> _result = new ArrayList<TelemetryEvent>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final TelemetryEvent _item;
            final long _tmpId;
            _tmpId = _cursor.getLong(_cursorIndexOfId);
            final String _tmpSessionId;
            _tmpSessionId = _cursor.getString(_cursorIndexOfSessionId);
            final String _tmpFarmerId;
            if (_cursor.isNull(_cursorIndexOfFarmerId)) {
              _tmpFarmerId = null;
            } else {
              _tmpFarmerId = _cursor.getString(_cursorIndexOfFarmerId);
            }
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpPage;
            if (_cursor.isNull(_cursorIndexOfPage)) {
              _tmpPage = null;
            } else {
              _tmpPage = _cursor.getString(_cursorIndexOfPage);
            }
            final String _tmpPropsJson;
            _tmpPropsJson = _cursor.getString(_cursorIndexOfPropsJson);
            final long _tmpTsEpochMs;
            _tmpTsEpochMs = _cursor.getLong(_cursorIndexOfTsEpochMs);
            final boolean _tmpFlushed;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfFlushed);
            _tmpFlushed = _tmp != 0;
            _item = new TelemetryEvent(_tmpId,_tmpSessionId,_tmpFarmerId,_tmpName,_tmpPage,_tmpPropsJson,_tmpTsEpochMs,_tmpFlushed);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object pendingCount(final Continuation<? super Integer> $completion) {
    final String _sql = "SELECT COUNT(*) FROM events WHERE flushed = 0";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<Integer>() {
      @Override
      @NonNull
      public Integer call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final Integer _result;
          if (_cursor.moveToFirst()) {
            final int _tmp;
            _tmp = _cursor.getInt(0);
            _result = _tmp;
          } else {
            _result = 0;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object markFlushed(final List<Long> ids, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final StringBuilder _stringBuilder = StringUtil.newStringBuilder();
        _stringBuilder.append("UPDATE events SET flushed = 1 WHERE id IN (");
        final int _inputSize = ids.size();
        StringUtil.appendPlaceholders(_stringBuilder, _inputSize);
        _stringBuilder.append(")");
        final String _sql = _stringBuilder.toString();
        final SupportSQLiteStatement _stmt = __db.compileStatement(_sql);
        int _argIndex = 1;
        for (long _item : ids) {
          _stmt.bindLong(_argIndex, _item);
          _argIndex++;
        }
        __db.beginTransaction();
        try {
          _stmt.executeUpdateDelete();
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}

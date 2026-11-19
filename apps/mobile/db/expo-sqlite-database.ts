import type { SQLiteBindValue, SQLiteDatabase as ExpoDatabase } from 'expo-sqlite';
import type { SqliteDatabase, SqliteStatement } from 'kysely';

type Params = ReadonlyArray<unknown>;

function withStatement<T>(db: ExpoDatabase, sql: string, fn: (statement: ReturnType<ExpoDatabase['prepareSync']>) => T): T {
  const statement = db.prepareSync(sql);
  try {
    return fn(statement);
  } finally {
    statement.finalizeSync();
  }
}

export function toKyselyDatabase(db: ExpoDatabase): SqliteDatabase {
  return {
    close: () => db.closeSync(),
    prepare(sql: string): SqliteStatement {
      const reader = withStatement(db, sql, (statement) => statement.getColumnNamesSync().length > 0);
      const all = (parameters: Params) =>
        withStatement(db, sql, (statement) => statement.executeSync<unknown>(parameters as SQLiteBindValue[]).getAllSync());
      return {
        reader,
        all,
        run: (parameters: Params) =>
          withStatement(db, sql, (statement) => {
            const { changes, lastInsertRowId } = statement.executeSync(parameters as SQLiteBindValue[]);
            return { changes, lastInsertRowid: lastInsertRowId };
          }),
        iterate: (parameters: Params) => all(parameters)[Symbol.iterator](),
      };
    },
  };
}

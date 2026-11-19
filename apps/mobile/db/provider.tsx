import type { Kysely } from 'kysely';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initDb } from './client';
import { openAppDb } from './open';
import type { DB } from './types';

const DbContext = createContext<Kysely<DB> | null>(null);

type State = { status: 'loading' } | { status: 'ready'; db: Kysely<DB> } | { status: 'error'; error: Error };

let ready: Promise<Kysely<DB>> | null = null;

function getAppDb(): Promise<Kysely<DB>> {
  if (!ready) {
    const db = openAppDb();
    ready = initDb(db).then(() => db);
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export function useDbInit(): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    getAppDb()
      .then((db) => active && setState({ status: 'ready', db }))
      .catch((error: Error) => active && setState({ status: 'error', error }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}

export function DbProvider({ db, children }: { db: Kysely<DB>; children: ReactNode }) {
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb(): Kysely<DB> {
  const db = useContext(DbContext);
  if (!db) {
    throw new Error('useDb doit être utilisé sous DbProvider');
  }
  return db;
}

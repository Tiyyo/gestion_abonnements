import { todayIn } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { loadWidgetTransfers } from '@/db/repositories/widget-transfers';
import type { DB } from '@/db/types';
import { widgetBridge } from './native';
import { buildWidgetSnapshot } from './snapshot';

let db: Kysely<DB> | null = null;
let chain: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSent: string | null = null;

export function attachWidgetDb(database: Kysely<DB>): void {
  db = database;
}

async function refreshNow(database: Kysely<DB>): Promise<void> {
  const json = JSON.stringify(buildWidgetSnapshot(await loadWidgetTransfers(database), todayIn()));
  if (json !== lastSent) {
    widgetBridge.setSnapshot(json);
    lastSent = json;
  }
}

/**
 * Met à jour le widget de l'écran d'accueil à partir de la base, de façon différée et sérialisée
 * (plusieurs demandes rapprochées n'en déclenchent qu'une). Un échec est sans conséquence pour l'app.
 */
export function requestWidgetRefresh(delayMs = 400): void {
  if (!db) {
    return;
  }
  const database = db;
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    chain = chain.then(() => refreshNow(database)).catch(() => undefined);
  }, delayMs);
}

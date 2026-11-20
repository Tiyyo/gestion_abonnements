import { type Kysely, sql } from 'kysely';

const up_statements: string[] = [
  `ALTER TABLE settings ADD COLUMN auto_reconcile_enabled INTEGER NOT NULL DEFAULT 1 CHECK (auto_reconcile_enabled IN (0,1))`,
  `ALTER TABLE settings ADD COLUMN bank_sync_from TEXT`,
  `ALTER TABLE settings ADD COLUMN bank_sync_through TEXT`,
  `ALTER TABLE settings ADD COLUMN bank_sync_at TEXT`,
  `CREATE TABLE bank_transaction (
    id               TEXT PRIMARY KEY,
    booking_date     TEXT NOT NULL,
    amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
    label            TEXT NOT NULL,
    outcome          TEXT NOT NULL
                     CHECK (outcome IN ('applied','suggested','unmatched','recorded','dismissed','internal')),
    charge_id        TEXT,
    subscription_id  TEXT,
    ref_id           TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `CREATE INDEX idx_bank_transaction_charge ON bank_transaction(charge_id)`,
  `CREATE INDEX idx_bank_transaction_outcome ON bank_transaction(outcome)`,
];

const down_statements: string[] = [
  `DROP TABLE bank_transaction`,
  `ALTER TABLE settings DROP COLUMN bank_sync_at`,
  `ALTER TABLE settings DROP COLUMN bank_sync_through`,
  `ALTER TABLE settings DROP COLUMN bank_sync_from`,
  `ALTER TABLE settings DROP COLUMN auto_reconcile_enabled`,
];

export async function up(db: Kysely<unknown>): Promise<void> {
  for (const statement of up_statements) {
    await sql.raw(statement).execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const statement of down_statements) {
    await sql.raw(statement).execute(db);
  }
}

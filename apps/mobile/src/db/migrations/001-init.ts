/* eslint-disable max-lines -- migration figée : le schéma initial complet est appliqué en une seule étape et ne doit plus changer. */
import { type Kysely, sql } from 'kysely';

const up_statements: string[] = [
  `CREATE TABLE settings (
    id                    INTEGER PRIMARY KEY CHECK (id = 1),
    payday_day            INTEGER NOT NULL DEFAULT 1 CHECK (payday_day BETWEEN 1 AND 31),
    global_margin_bp      INTEGER NOT NULL DEFAULT 300 CHECK (global_margin_bp BETWEEN 0 AND 500),
    funding_lead_days     INTEGER NOT NULL DEFAULT 1 CHECK (funding_lead_days BETWEEN 1 AND 5),
    default_currency      TEXT NOT NULL DEFAULT 'EUR',
    notif_time            TEXT NOT NULL DEFAULT '09:00' CHECK (notif_time GLOB '[0-2][0-9]:[0-5][0-9]'),
    trial_reminder_days   TEXT NOT NULL DEFAULT '[3,1]' CHECK (json_valid(trial_reminder_days)),
    cancel_reminder_days  TEXT NOT NULL DEFAULT '[3,1]' CHECK (json_valid(cancel_reminder_days)),
    biometric_lock        INTEGER NOT NULL DEFAULT 1 CHECK (biometric_lock IN (0,1)),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `INSERT INTO settings (id) VALUES (1)`,

  `CREATE TABLE category (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    icon_key    TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
  )`,
  `INSERT INTO category (id, name, icon_key, sort_order) VALUES
    ('cat-musique',      'Musique',        'music',     10),
    ('cat-video',        'Vidéo',          'video',     20),
    ('cat-cloud',        'Stockage cloud', 'cloud',     30),
    ('cat-jeux',         'Jeux',           'gamepad',   40),
    ('cat-productivite', 'Productivité',   'briefcase', 50),
    ('cat-presse',       'Presse',         'newspaper', 60),
    ('cat-sport',        'Santé/Sport',    'heart',     70),
    ('cat-ia',           'IA',             'sparkles',  80),
    ('cat-autre',        'Autre',          'tag',       99)`,

  `CREATE TABLE subscription (
    id                       TEXT PRIMARY KEY,
    name                     TEXT NOT NULL,
    category_id              TEXT NOT NULL DEFAULT 'cat-autre' REFERENCES category(id),
    icon_key                 TEXT NOT NULL DEFAULT 'tag',
    amount_cents             INTEGER NOT NULL CHECK (amount_cents > 0),
    currency                 TEXT NOT NULL DEFAULT 'EUR',
    fx_buffer_bp             INTEGER NOT NULL DEFAULT 0 CHECK (fx_buffer_bp BETWEEN 0 AND 500),
    period_unit              TEXT NOT NULL CHECK (period_unit IN ('week','month','year')),
    period_count             INTEGER NOT NULL DEFAULT 1 CHECK (period_count BETWEEN 1 AND 12),
    anchor_day               INTEGER CHECK (anchor_day BETWEEN 1 AND 31),
    next_charge_date         TEXT NOT NULL,
    status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('trial','active','to_cancel','cancelled')),
    payment_method           TEXT NOT NULL DEFAULT 'revolut' CHECK (payment_method IN ('revolut','other')),
    margin_override_bp       INTEGER CHECK (margin_override_bp BETWEEN 0 AND 500),
    trial_end_date           TEXT,
    post_trial_amount_cents  INTEGER CHECK (post_trial_amount_cents > 0),
    period_end_date          TEXT,
    cancel_done              INTEGER NOT NULL DEFAULT 0 CHECK (cancel_done IN (0,1)),
    cancel_url               TEXT CHECK (cancel_url IS NULL OR cancel_url LIKE 'https://%'),
    ai_suggestion            TEXT CHECK (ai_suggestion IS NULL OR json_valid(ai_suggestion)),
    notes                    TEXT,
    created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    archived_at              TEXT,
    CHECK (status <> 'trial' OR (trial_end_date IS NOT NULL AND post_trial_amount_cents IS NOT NULL)),
    CHECK (status <> 'to_cancel' OR period_end_date IS NOT NULL),
    CHECK (anchor_day IS NOT NULL OR period_unit = 'week')
  )`,
  `CREATE INDEX idx_subscription_status ON subscription(status) WHERE archived_at IS NULL`,
  `CREATE INDEX idx_subscription_next ON subscription(next_charge_date) WHERE archived_at IS NULL`,

  `CREATE TABLE charge (
    id                     TEXT PRIMARY KEY,
    subscription_id        TEXT NOT NULL REFERENCES subscription(id) ON DELETE CASCADE,
    due_date               TEXT NOT NULL,
    expected_amount_cents  INTEGER NOT NULL CHECK (expected_amount_cents > 0),
    funded_amount_cents    INTEGER NOT NULL DEFAULT 0 CHECK (funded_amount_cents >= 0),
    status                 TEXT NOT NULL DEFAULT 'planned'
                           CHECK (status IN ('planned','funded','paid','failed','unfunded','skipped')),
    is_trial_conversion    INTEGER NOT NULL DEFAULT 0 CHECK (is_trial_conversion IN (0,1)),
    provision_only         INTEGER NOT NULL DEFAULT 0 CHECK (provision_only IN (0,1)),
    actual_amount_cents    INTEGER CHECK (actual_amount_cents >= 0),
    actual_date            TEXT,
    created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE (subscription_id, due_date, provision_only),
    CHECK (status <> 'paid' OR (actual_amount_cents IS NOT NULL AND actual_date IS NOT NULL)),
    CHECK (status <> 'unfunded' OR funded_amount_cents = 0)
  )`,
  `CREATE INDEX idx_charge_due ON charge(due_date)`,
  `CREATE INDEX idx_charge_sub_due ON charge(subscription_id, due_date)`,
  `CREATE INDEX idx_charge_status_due ON charge(status, due_date)`,

  `CREATE TABLE transfer (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL CHECK (type IN ('payday','vault_to_main','residual_return')),
    planned_date  TEXT NOT NULL,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
    status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','skipped')),
    done_at       TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    CHECK (status <> 'done' OR done_at IS NOT NULL)
  )`,
  `CREATE INDEX idx_transfer_date ON transfer(planned_date, type)`,

  `CREATE TABLE transfer_charge (
    transfer_id   TEXT NOT NULL REFERENCES transfer(id) ON DELETE CASCADE,
    charge_id     TEXT NOT NULL REFERENCES charge(id) ON DELETE CASCADE,
    amount_cents  INTEGER NOT NULL CHECK (amount_cents > 0),
    PRIMARY KEY (transfer_id, charge_id)
  )`,
  `CREATE INDEX idx_transfer_charge_charge ON transfer_charge(charge_id)`,

  `CREATE TABLE event (
    id               TEXT PRIMARY KEY,
    subscription_id  TEXT REFERENCES subscription(id) ON DELETE SET NULL,
    type             TEXT NOT NULL CHECK (type IN (
                       'price_change','unexpected_charge','duplicate','post_cancel_charge',
                       'charge_failed','status_change','note')),
    occurred_on      TEXT NOT NULL,
    amount_cents     INTEGER,
    payload          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload)),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `CREATE INDEX idx_event_sub ON event(subscription_id, occurred_on DESC)`,
  `CREATE INDEX idx_event_date ON event(occurred_on DESC)`,

  `CREATE TABLE ai_correction (
    name_normalized  TEXT PRIMARY KEY,
    category_id      TEXT NOT NULL REFERENCES category(id),
    icon_key         TEXT NOT NULL,
    corrected_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,

  `CREATE TABLE scheduled_notification (
    id                  TEXT PRIMARY KEY,
    kind                TEXT NOT NULL CHECK (kind IN ('funding','trial_end','cancel_end','payday','residual')),
    ref_id              TEXT,
    fire_at             TEXT NOT NULL,
    os_notification_id  TEXT,
    UNIQUE (kind, ref_id, fire_at)
  )`,
  `CREATE INDEX idx_notif_fire ON scheduled_notification(fire_at)`,

  `CREATE TRIGGER trg_subscription_updated AFTER UPDATE ON subscription
   FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE subscription SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
   END`,
  `CREATE TRIGGER trg_charge_updated AFTER UPDATE ON charge
   FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE charge SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
   END`,
  `CREATE TRIGGER trg_transfer_updated AFTER UPDATE ON transfer
   FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE transfer SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
   END`,
  `CREATE TRIGGER trg_settings_updated AFTER UPDATE ON settings
   FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
   BEGIN
     UPDATE settings SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = NEW.id;
   END`,

  `CREATE VIEW v_subscription_margin AS
   SELECT s.id AS subscription_id,
          COALESCE(s.margin_override_bp, st.global_margin_bp) + s.fx_buffer_bp AS margin_bp
     FROM subscription s CROSS JOIN settings st`,

  `CREATE VIEW v_upcoming_charge AS
   SELECT c.id AS charge_id,
          c.due_date,
          s.id AS subscription_id,
          s.name,
          s.icon_key,
          c.expected_amount_cents,
          c.funded_amount_cents,
          c.status,
          c.is_trial_conversion,
          t.id AS transfer_id,
          t.planned_date AS transfer_date,
          t.status AS transfer_status
     FROM charge c
     JOIN subscription s ON s.id = c.subscription_id
     LEFT JOIN transfer_charge tc ON tc.charge_id = c.id
     LEFT JOIN transfer t ON t.id = tc.transfer_id AND t.type = 'vault_to_main'
    WHERE c.status IN ('planned','funded','unfunded')
      AND c.provision_only = 0
      AND s.archived_at IS NULL`,

  `CREATE VIEW v_monthly_cost AS
   SELECT s.id AS subscription_id,
          s.category_id,
          CAST(ROUND(
            CASE s.period_unit
              WHEN 'week'  THEN s.amount_cents * 52.0 / 12 / s.period_count
              WHEN 'month' THEN s.amount_cents * 1.0 / s.period_count
              WHEN 'year'  THEN s.amount_cents / 12.0 / s.period_count
            END) AS INTEGER) AS monthly_cents
     FROM subscription s
    WHERE s.status = 'active' AND s.archived_at IS NULL`,

  `CREATE VIEW v_cost_by_category AS
   SELECT c.name AS category,
          SUM(m.monthly_cents) AS monthly_cents
     FROM v_monthly_cost m
     JOIN category c ON c.id = m.category_id
    GROUP BY c.id`,

  `CREATE VIEW v_charge_variance AS
   SELECT c.id AS charge_id,
          c.subscription_id,
          c.due_date,
          c.expected_amount_cents,
          c.actual_amount_cents,
          c.actual_amount_cents - c.expected_amount_cents AS variance_cents
     FROM charge c
    WHERE c.status = 'paid' AND c.actual_amount_cents <> c.expected_amount_cents`,
];

const down_statements: string[] = [
  `DROP VIEW IF EXISTS v_charge_variance`,
  `DROP VIEW IF EXISTS v_cost_by_category`,
  `DROP VIEW IF EXISTS v_monthly_cost`,
  `DROP VIEW IF EXISTS v_upcoming_charge`,
  `DROP VIEW IF EXISTS v_subscription_margin`,
  `DROP TABLE IF EXISTS scheduled_notification`,
  `DROP TABLE IF EXISTS ai_correction`,
  `DROP TABLE IF EXISTS event`,
  `DROP TABLE IF EXISTS transfer_charge`,
  `DROP TABLE IF EXISTS transfer`,
  `DROP TABLE IF EXISTS charge`,
  `DROP TABLE IF EXISTS subscription`,
  `DROP TABLE IF EXISTS category`,
  `DROP TABLE IF EXISTS settings`,
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

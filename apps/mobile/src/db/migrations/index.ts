import type { Migration, MigrationProvider } from 'kysely/migration';
import * as m001 from './001-init';
import * as m002 from './002-transfer-rescheduled';
import * as m003 from './003-settings-onboarding';
import * as m004 from './004-settings-toggles';
import * as m005 from './005-bank-sync';
import * as m006 from './006-settings-theme-mode';

export const migrations: Record<string, Migration> = {
  '001_init': m001,
  '002_transfer_rescheduled': m002,
  '003_settings_onboarding': m003,
  '004_settings_toggles': m004,
  '005_bank_sync': m005,
  '006_settings_theme_mode': m006,
};

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

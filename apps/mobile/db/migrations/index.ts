import type { Migration, MigrationProvider } from 'kysely/migration';
import * as m001 from './001_init';
import * as m002 from './002_transfer_rescheduled';
import * as m003 from './003_settings_onboarding';

export const migrations: Record<string, Migration> = {
  '001_init': m001,
  '002_transfer_rescheduled': m002,
  '003_settings_onboarding': m003,
};

export const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

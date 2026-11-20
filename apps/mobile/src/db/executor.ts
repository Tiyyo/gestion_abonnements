import type { Kysely, Transaction } from 'kysely';
import type { DB } from './types';

/** Connexion ou transaction : les repositories et la synchronisation acceptent l'une ou l'autre. */
export type Executor = Kysely<DB> | Transaction<DB>;

/** Générateur d'identifiants injecté (UUID v4 dans l'app, déterministe dans les tests). */
export type NewId = () => string;

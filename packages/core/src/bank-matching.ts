import { addDays, compareDates, diffDays, type IsoDate } from './calendar';
import { MATCH_TOLERANCE_DAYS, normalizeName } from './reconciliation';
import type { ChargeStatus, SubscriptionStatus } from './types';

/** Débit comptabilisé en euros, lu sur le compte principal. */
export interface BankDebit {
  id: string;
  date: IsoDate;
  amountCents: number;
  label: string;
  remittance: string | null;
}

export interface MatchSubscription {
  id: string;
  name: string;
  /** Autres noms sous lesquels le marchand peut apparaître (nom de la marque du logo). */
  aliases: readonly string[];
  status: SubscriptionStatus;
}

/** Prélèvement ouvert, non provisionnel et pas déjà proposé pour un autre débit. */
export interface MatchOpenCharge {
  id: string;
  subscriptionId: string;
  dueDate: IsoDate;
  status: Extract<ChargeStatus, 'planned' | 'funded' | 'unfunded'>;
  expectedAmountCents: number;
  isTrialConversion: boolean;
}

/** Prélèvement déjà marqué passé à la main, pas encore rattaché à un débit de la banque. */
export interface MatchPaidCharge {
  id: string;
  subscriptionId: string;
  actualAmountCents: number;
  actualDate: IsoDate;
}

export interface DatedAmount {
  amountCents: number;
  date: IsoDate;
}

export interface MatchingInput {
  debits: readonly BankDebit[];
  subscriptions: readonly MatchSubscription[];
  openCharges: readonly MatchOpenCharge[];
  paidCharges: readonly MatchPaidCharge[];
  /** Débits inconnus déjà saisis à la main (événements), pas encore rattachés à un débit de la banque. */
  recordedDebits: readonly DatedAmount[];
  /** Retours de résidu vers le coffre déjà faits : ce sont des débits du compte principal, pas des prélèvements. */
  vaultReturns: readonly DatedAmount[];
}

/** Pourquoi un débit rattaché à un prélèvement n'est pas appliqué d'office. */
export type SuggestReason = 'several_candidates' | 'trial' | 'unwanted' | 'not_funded' | 'amount_differs';

export type DebitDecision =
  | { kind: 'apply'; debit: BankDebit; chargeId: string }
  | { kind: 'suggest'; debit: BankDebit; chargeId: string; reason: SuggestReason }
  | { kind: 'already_paid'; debit: BankDebit; chargeId: string }
  | { kind: 'already_recorded'; debit: BankDebit }
  | { kind: 'internal'; debit: BankDebit }
  | { kind: 'unmatched'; debit: BankDebit; subscriptionId: string | null };

const MIN_KEY_LENGTH = 3;
const MIN_SUBSTRING_LENGTH = 5;

function tokens(value: string): string[] {
  return normalizeName(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Le libellé du relevé désigne-t-il ce nom ? Tous les mots du nom sont présents dans le libellé, ou le nom
 * sans séparateurs y figure d'un bloc (« Disney+ » dans « DISNEYPLUS »), à partir de cinq caractères seulement.
 */
export function labelMatchesName(label: string, name: string): boolean {
  const wanted = tokens(name);
  const key = wanted.join('');
  if (key.length < MIN_KEY_LENGTH) {
    return false;
  }
  const present = tokens(label);
  if (wanted.every((word) => present.includes(word))) {
    return true;
  }
  return key.length >= MIN_SUBSTRING_LENGTH && present.join('').includes(key);
}

function near(a: IsoDate, b: IsoDate): boolean {
  return Math.abs(diffDays(a, b)) <= MATCH_TOLERANCE_DAYS;
}

/** Retire et rend vrai le premier montant identique à ±3 jours : chaque écriture ne sert qu'une fois. */
function consume(pool: DatedAmount[], debit: BankDebit): boolean {
  const index = pool.findIndex((entry) => entry.amountCents === debit.amountCents && near(entry.date, debit.date));
  if (index < 0) {
    return false;
  }
  pool.splice(index, 1);
  return true;
}

function suggestReason(
  debit: BankDebit,
  charge: MatchOpenCharge,
  subscription: MatchSubscription,
  single: boolean,
): SuggestReason | null {
  if (!single) {
    return 'several_candidates';
  }
  if (charge.isTrialConversion && subscription.status === 'trial') {
    return 'trial';
  }
  if (charge.status === 'unfunded') {
    return 'unwanted';
  }
  if (charge.status !== 'funded') {
    return 'not_funded';
  }
  return debit.amountCents === charge.expectedAmountCents ? null : 'amount_differs';
}

interface Pools {
  open: MatchOpenCharge[];
  paid: MatchPaidCharge[];
  recorded: DatedAmount[];
  returns: DatedAmount[];
}

function decide(debit: BankDebit, subscriptions: readonly MatchSubscription[], pools: Pools): DebitDecision {
  const haystack = `${debit.label} ${debit.remittance ?? ''}`;
  const matched = subscriptions.filter((s) => [s.name, ...s.aliases].some((name) => labelMatchesName(haystack, name)));
  const ids = new Set(matched.map((s) => s.id));

  const candidates = pools.open
    .filter((c) => ids.has(c.subscriptionId) && near(c.dueDate, debit.date))
    .sort(
      (a, b) =>
        Number(b.expectedAmountCents === debit.amountCents) - Number(a.expectedAmountCents === debit.amountCents) ||
        Math.abs(diffDays(a.dueDate, debit.date)) - Math.abs(diffDays(b.dueDate, debit.date)) ||
        compareDates(a.dueDate, b.dueDate),
    );
  const charge = candidates[0];
  if (charge) {
    pools.open.splice(pools.open.indexOf(charge), 1);
    const subscription = matched.find((s) => s.id === charge.subscriptionId) as MatchSubscription;
    const reason = suggestReason(debit, charge, subscription, matched.length === 1 && candidates.length === 1);
    return reason ? { kind: 'suggest', debit, chargeId: charge.id, reason } : { kind: 'apply', debit, chargeId: charge.id };
  }

  const paid = pools.paid.find(
    (c) => ids.has(c.subscriptionId) && c.actualAmountCents === debit.amountCents && near(c.actualDate, debit.date),
  );
  if (paid) {
    pools.paid.splice(pools.paid.indexOf(paid), 1);
    return { kind: 'already_paid', debit, chargeId: paid.id };
  }
  if (consume(pools.recorded, debit)) {
    return { kind: 'already_recorded', debit };
  }
  if (matched.length === 0 && consume(pools.returns, debit)) {
    return { kind: 'internal', debit };
  }
  return { kind: 'unmatched', debit, subscriptionId: matched.length === 1 ? (matched[0] as MatchSubscription).id : null };
}

/**
 * Rattache chaque débit de la banque à un prélèvement attendu. Seul un rattachement sans équivoque est appliqué
 * d'office (`apply`) : un seul abonnement reconnu, un seul prélèvement ouvert à ±3 jours, déjà financé, au montant
 * exact, hors fin d'essai. Tout le reste est proposé à l'utilisateur (`suggest`) ou signalé (`unmatched`).
 * Un prélèvement ne sert qu'à un seul débit.
 */
export function matchBankDebits(input: MatchingInput): DebitDecision[] {
  const pools: Pools = {
    open: [...input.openCharges],
    paid: [...input.paidCharges],
    recorded: [...input.recordedDebits],
    returns: [...input.vaultReturns],
  };
  return [...input.debits]
    .sort((a, b) => compareDates(a.date, b.date) || a.id.localeCompare(b.id))
    .map((debit) => decide(debit, input.subscriptions, pools));
}

/** Période relue sans trou sur le compte principal : du premier jour relu au jour de la dernière lecture complète. */
export interface BankCoverage {
  from: IsoDate;
  through: IsoDate;
}

export const FIRST_SYNC_DAYS = 7;
export const SYNC_OVERLAP_DAYS = 5;

/** Date à partir de laquelle relire : on reprend quelques jours avant la dernière lecture (débits comptabilisés en retard). */
export function nextSyncFrom(coverage: BankCoverage | null, today: IsoDate): IsoDate {
  return coverage ? addDays(coverage.through, -SYNC_OVERLAP_DAYS) : addDays(today, -FIRST_SYNC_DAYS);
}

/** Couverture après une lecture depuis `from` : inchangée si la lecture est incomplète, repartie de `from` s'il y a un trou. */
export function mergeCoverage(previous: BankCoverage | null, from: IsoDate, complete: boolean, today: IsoDate): BankCoverage | null {
  if (!complete) {
    return previous;
  }
  const contiguous = previous !== null && compareDates(from, previous.through) <= 0;
  return { from: contiguous && compareDates(previous.from, from) < 0 ? previous.from : from, through: today };
}

/**
 * Un prélèvement encore ouvert a-t-il vraisemblablement échoué ? Oui si toute sa fenêtre de ±3 jours a été relue
 * sur le compte et qu'aucun débit, même non reconnu, n'y figure. Ce n'est qu'une réponse suggérée : l'état de la
 * charge ne change que lorsque l'utilisateur répond (10.5).
 */
export function looksFailed(dueDate: IsoDate, coverage: BankCoverage | null, unmatchedDebitDates: readonly IsoDate[]): boolean {
  if (!coverage) {
    return false;
  }
  const covered =
    compareDates(addDays(dueDate, -MATCH_TOLERANCE_DAYS), coverage.from) >= 0 && diffDays(dueDate, coverage.through) > MATCH_TOLERANCE_DAYS;
  return covered && !unmatchedDebitDates.some((date) => near(date, dueDate));
}

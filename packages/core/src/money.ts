export const MAX_MARGIN_BP = 500;

export class InvalidAmountError extends Error {}

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new InvalidAmountError(`${label} doit être un entier de centimes positif ou nul : ${value}`);
  }
}

export function assertMarginBp(marginBp: number): void {
  if (!Number.isInteger(marginBp) || marginBp < 0 || marginBp > MAX_MARGIN_BP) {
    throw new InvalidAmountError(`marge hors bornes (0 à ${MAX_MARGIN_BP} bp) : ${marginBp}`);
  }
}

export function effectiveMarginBp(overrideBp: number | null, globalBp: number): number {
  const margin = overrideBp ?? globalBp;
  assertMarginBp(margin);
  return margin;
}

export function fundedAmountCents(expectedCents: number, marginBp: number): number {
  assertCents(expectedCents, 'montant attendu');
  assertMarginBp(marginBp);
  return Math.floor((expectedCents * (10000 + marginBp) + 9999) / 10000);
}

export function ceilDiv(cents: number, divisor: number): number {
  assertCents(cents, 'montant');
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new InvalidAmountError(`diviseur invalide : ${divisor}`);
  }
  return Math.ceil(cents / divisor);
}

export function formatEuros(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${euros},${(abs % 100).toString().padStart(2, '0')}\u202f€`;
}

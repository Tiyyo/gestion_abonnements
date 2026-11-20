import { fundedAmountCents } from '@abonnements/core';
import { resolveIconKey } from '@/features/enrich/brands';
import type { Suggestion } from '@/features/enrich/suggestion';
import { BRAND_ICONS } from '@/features/subscriptions/brand-icons';
import { monthlyProvisionCents } from '@/features/subscriptions/funding';
import { PERIODICITIES, type PeriodicityKey, parseAmountCents, periodicityOf } from '@/features/subscriptions/subscription-form-schema';

export const SOURCE_LABELS = { correction: 'Ta correction', brand: 'Marque reconnue', ai: 'Suggestion IA · à vérifier' } as const;

export const PER: Record<PeriodicityKey, string> = {
  week: 'par semaine',
  month: 'par mois',
  quarter: 'par trimestre',
  half: 'par semestre',
  year: 'par an',
  biennial: 'tous les 2 ans',
};

export const PAYMENT_METHODS = [
  { key: 'revolut', label: 'Revolut', hint: 'Financé depuis le coffre' },
  { key: 'other', label: 'Autre', hint: 'Suivi seulement, aucun transfert prévu' },
] as const;

export type SheetKind = 'category' | 'periodicity' | 'logo' | 'payment';

export const SHEET_TITLES: Record<SheetKind, string> = {
  category: 'Catégorie',
  periodicity: 'Périodicité',
  logo: 'Logo',
  payment: 'Moyen de paiement',
};

/** Pas et plafond de la marge propre à un abonnement (points de base). */
export const MARGIN_STEP_BP = 50;
export const MARGIN_MAX_BP = 500;

export function dateLabel(status: string): string {
  return status === 'trial' ? 'Fin d’essai' : status === 'cancelled' ? 'Dernière échéance' : 'Prochain prélèvement';
}

/** Libellé du logo affiché : celui enregistré, ou celui déduit du nom quand aucun n'a été choisi. */
export function logoLabel(iconKey: string | null, name = ''): string {
  const shown = resolveIconKey(name, iconKey);
  return shown && BRAND_ICONS[shown] ? BRAND_ICONS[shown].title : 'Initiale du nom';
}

export function periodicityLabel(key: PeriodicityKey): string {
  return PERIODICITIES.find((p) => p.key === key)?.label ?? '';
}

export function paymentLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.key === method)?.label ?? '';
}

/** Ce qu'apporte la suggestion, au-delà de la catégorie et du logo. */
export function suggestionSummary(suggestion: Pick<Suggestion, 'trialDays' | 'cancelUrl'>): string {
  return (
    [suggestion.trialDays ? `essai usuel ${suggestion.trialDays} jours` : null, suggestion.cancelUrl ? 'lien de résiliation trouvé' : null]
      .filter(Boolean)
      .join(' · ') || 'catégorie et logo'
  );
}

/** Marge suivante, bornée entre 0 et le plafond. */
export function stepMargin(marginBp: number, direction: 1 | -1): number {
  return direction > 0 ? Math.min(MARGIN_MAX_BP, marginBp + MARGIN_STEP_BP) : Math.max(0, marginBp - MARGIN_STEP_BP);
}

/** Aperçu du financement : montant sorti du coffre à chaque prélèvement et mise de côté mensuelle éventuelle. */
export function fundingPreview(amount: string, marginBp: number, periodicity: PeriodicityKey): { funded: number; monthly: number | null } {
  const amountCents = /^\d/.test(amount) ? parseAmountCents(amount) : 0;
  const funded = amountCents > 0 ? fundedAmountCents(amountCents, marginBp) : 0;
  const period = periodicityOf(periodicity);
  return { funded, monthly: monthlyProvisionCents(funded, period.unit, period.count) };
}

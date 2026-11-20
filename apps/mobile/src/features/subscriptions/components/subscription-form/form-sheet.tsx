import type { PaymentMethod } from '@abonnements/core';
import type { Category } from '@/db/types';
import type { PeriodicityKey } from '@/features/subscriptions/subscription-form-schema';
import { BottomSheet } from '@/ui/feedback/bottom-sheet';
import { CategoryOptions } from './category-options';
import { SHEET_TITLES, type SheetKind } from './form-labels';
import { LogoOptions } from './logo-options';
import { PaymentOptions } from './payment-options';
import { PeriodicityOptions } from './periodicity-options';

export interface FormSheetChoices {
  name: string;
  categories: readonly Category[];
  categoryId: string;
  periodicity: PeriodicityKey;
  paymentMethod: PaymentMethod;
  iconKey: string | null;
  onCategory: (id: string) => void;
  onPeriodicity: (key: PeriodicityKey) => void;
  onPayment: (method: PaymentMethod) => void;
  onIcon: (key: string | null) => void;
}

/**
 * Panneau de choix unique : `shown` garde le contenu affiché pendant l'animation de fermeture
 * (`open` passe à faux avant que le panneau ait fini de descendre).
 */
export function FormSheet({
  open,
  shown,
  onClose,
  choices,
}: {
  open: boolean;
  shown: SheetKind;
  onClose: () => void;
  choices: FormSheetChoices;
}) {
  return (
    <BottomSheet open={open} title={SHEET_TITLES[shown]} onClose={onClose}>
      {shown === 'category' ? (
        <CategoryOptions categories={choices.categories} selected={choices.categoryId} onSelect={choices.onCategory} />
      ) : null}
      {shown === 'periodicity' ? <PeriodicityOptions selected={choices.periodicity} onSelect={choices.onPeriodicity} /> : null}
      {shown === 'payment' ? <PaymentOptions selected={choices.paymentMethod} onSelect={choices.onPayment} /> : null}
      {shown === 'logo' ? <LogoOptions name={choices.name} selected={choices.iconKey} onSelect={choices.onIcon} /> : null}
    </BottomSheet>
  );
}

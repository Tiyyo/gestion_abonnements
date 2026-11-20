import { todayIn } from '@abonnements/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { trialEndFrom } from '@/features/enrich/trial-end';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useCategories } from '@/features/subscriptions/hooks/use-categories';
import { openDatePicker } from '@/features/subscriptions/open-date-picker';
import { subscriptionFormSchema, type SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { type Correction, DEFAULT_TRIAL_DAYS } from '@/features/subscriptions/subscription-form-values';
import { haptic } from '@/ui/motion/haptics';
import { useFormChoices } from './use-form-choices';
import { useFormGuard } from './use-form-guard';
import { useSuggestionLookup } from './use-suggestion-lookup';

export interface SubscriptionFormOptions {
  mode: 'create' | 'edit';
  defaultValues: SubscriptionFormValues;
  lockedStatus?: 'trial' | 'active' | 'to_cancel' | 'cancelled';
  /** `close` ferme l'écran après un enregistrement réussi, sans redemander confirmation pour la saisie. */
  onSubmit: (values: SubscriptionFormValues, correction: Correction | null, aiSuggestion: string | null, close: () => void) => void;
}

const WATCHED = [
  'name',
  'status',
  'firstChargeDate',
  'categoryId',
  'iconKey',
  'amount',
  'periodicity',
  'paymentMethod',
  'marginOverrideBp',
] as const;

export function useSubscriptionForm({ mode, defaultValues, lockedStatus, onSubmit }: SubscriptionFormOptions) {
  const today = todayIn();
  const schema = useMemo(() => subscriptionFormSchema(today, { allowPastDate: mode === 'edit' }), [today, mode]);
  const categories = useCategories();
  const settings = useSettings();
  const { control, handleSubmit, getValues, setValue, formState } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  // useWatch plutôt que watch : abonnement explicite, compatible avec le React Compiler.
  const [name, watchedStatus, firstChargeDate, categoryId, iconKey, amount, periodicity, paymentMethod, marginOverrideBp] = useWatch({
    control,
    name: WATCHED,
  });
  const values = { name, firstChargeDate, categoryId, iconKey, amount, periodicity, paymentMethod, marginOverrideBp };
  const status = lockedStatus ?? watchedStatus;
  const guard = useFormGuard(control, defaultValues, mode);
  const globalMarginBp = settings.data?.global_margin_bp ?? 300;
  const lookup = useSuggestionLookup(mode, name, defaultValues.name);
  const [classificationTouched, setClassificationTouched] = useState(false);
  const choices = useFormChoices(setValue, () => setClassificationTouched(true));
  const findCategory = (id: string | undefined) => categories.data?.find((c) => c.id === id)?.name;

  const acceptSuggestion = () => {
    const s = lookup.suggestion;
    if (!s) {
      return;
    }
    haptic.success();
    setValue('categoryId', s.categoryId);
    setValue('iconKey', s.iconKey);
    if (s.cancelUrl && !getValues('cancelUrl')) {
      setValue('cancelUrl', s.cancelUrl);
    }
    if (status === 'trial' && s.trialDays) {
      setValue('firstChargeDate', trialEndFrom(s.trialDays, DEFAULT_TRIAL_DAYS), { shouldValidate: true });
    }
    lookup.markHandled();
    setClassificationTouched(false);
  };

  const pickDate = () =>
    openDatePicker(firstChargeDate, mode === 'create' ? today : undefined, (date) =>
      setValue('firstChargeDate', date, { shouldValidate: true }),
    );

  const changeStatus = (next: 'trial' | 'active') => {
    setValue('status', next);
    setValue('firstChargeDate', next === 'trial' ? trialEndFrom(lookup.suggestion?.trialDays ?? null, DEFAULT_TRIAL_DAYS) : today, {
      shouldValidate: true,
    });
  };

  const submit = handleSubmit(
    (submitted) => {
      const aiSuggestion = lookup.suggestion?.source === 'ai' ? JSON.stringify(lookup.suggestion) : null;
      onSubmit(
        submitted,
        classificationTouched ? { categoryId: submitted.categoryId, iconKey: submitted.iconKey ?? 'tag' } : null,
        aiSuggestion,
        guard.leave,
      );
    },
    () => haptic.error(),
  );

  return {
    control,
    errors: formState.errors,
    values,
    status,
    globalMarginBp,
    categories: categories.data ?? [],
    categoryName: findCategory(categoryId) ?? 'Autre',
    suggestedCategory: findCategory(lookup.suggestion?.categoryId),
    lookup,
    choices,
    acceptSuggestion,
    pickDate,
    changeStatus,
    submit,
  };
}

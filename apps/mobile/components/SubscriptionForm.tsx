import { ceilDiv, formatEuros, fundedAmountCents, isProvisioned, periodMonths, todayIn } from '@abonnements/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  Link,
  type LucideIcon,
  Minus,
  NotebookPen,
  Pencil,
  Percent,
  PiggyBank,
  Plus,
  Repeat,
  Sparkles,
  Tag,
} from 'lucide-react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { useCategories } from '../features/categories';
import { trialEndFrom, useSuggestion } from '../features/enrich';
import { useSettings } from '../features/settings';
import {
  PERIODICITIES,
  type PeriodicityKey,
  parseAmountCents,
  periodicityOf,
  subscriptionFormSchema,
  type SubscriptionFormValues,
} from '../features/subscription-form';
import { BRAND_ICONS } from '../ui/brand-icons';
import { ActionButton, Amount, Body, Caption, Card, colors, Heading, Label, Overline, TOP_GAP } from '../ui/kit';
import { formatDateFr, formatPercentBp as marginLabel, toIsoDate } from '../ui/format';
import { haptic, Reveal } from '../ui/motion';
import { Segmented } from '../ui/Segmented';
import { BottomSheet, SheetOption } from '../ui/sheet';
import { SubscriptionAvatar } from '../ui/SubscriptionAvatar';

export const DEFAULT_TRIAL_DAYS = 30;

export interface Correction {
  categoryId: string;
  iconKey: string;
}

interface Props {
  mode: 'create' | 'edit';
  title: string;
  submitLabel: string;
  defaultValues: SubscriptionFormValues;
  lockedStatus?: 'trial' | 'active' | 'to_cancel' | 'cancelled';
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: SubscriptionFormValues, correction: Correction | null, aiSuggestion: string | null) => void;
}

const SOURCE_LABELS = { correction: 'Ta correction', brand: 'Marque reconnue', ai: 'Suggestion IA · à vérifier' } as const;

const PER: Record<PeriodicityKey, string> = {
  week: 'par semaine',
  month: 'par mois',
  quarter: 'par trimestre',
  half: 'par semestre',
  year: 'par an',
  biennial: 'tous les 2 ans',
};

const PAYMENT_METHODS = [
  { key: 'revolut', label: 'Revolut', hint: 'Financé depuis le coffre' },
  { key: 'other', label: 'Autre', hint: 'Suivi seulement, aucun transfert prévu' },
] as const;

type SheetKind = 'category' | 'periodicity' | 'logo' | 'payment';

const SHEET_TITLES: Record<SheetKind, string> = {
  category: 'Catégorie',
  periodicity: 'Périodicité',
  logo: 'Logo',
  payment: 'Moyen de paiement',
};

function FieldError({ message, center }: { message?: string; center?: boolean }) {
  return message ? (
    <Caption color="dangerText" text={center ? 'center' : undefined} accessibilityLiveRegion="polite">
      {message}
    </Caption>
  ) : null;
}

function Row({ icon: Icon, children, last }: { icon: LucideIcon; children: ReactNode; last?: boolean }) {
  return (
    <XStack minH={56} py="3" gap="3" items="center" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <Icon color={colors.muted} size={20} />
      {children}
    </XStack>
  );
}

function PickerRow({
  icon: Icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <XStack
      minH={56}
      py="3"
      gap="3"
      items="center"
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={onPress}
      opacity="1 press:0.6"
      transition="fast"
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}. Modifier`}
    >
      <Icon color={colors.muted} size={20} />
      <Body>{label}</Body>
      <Body flex={1} text="right" color="colorMuted" numberOfLines={1}>
        {value}
      </Body>
      <ChevronRight color={colors.muted} size={18} />
    </XStack>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack gap="2">
      <Overline px="1">{title}</Overline>
      <Card py="0" gap="0">
        {children}
      </Card>
    </YStack>
  );
}

function StepButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <YStack
      w={40}
      h={40}
      rounded="full"
      items="center"
      justify="center"
      bg="subtle"
      scale="1 press:0.94"
      transition="fast"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon color={colors.text} size={18} />
    </YStack>
  );
}

export function SubscriptionForm({ mode, title, submitLabel, defaultValues, lockedStatus, busy, error, onCancel, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const today = todayIn();
  const schema = useMemo(() => subscriptionFormSchema(today, { allowPastDate: mode === 'edit' }), [today, mode]);
  const categories = useCategories();
  const settings = useSettings();
  const globalMarginBp = settings.data?.global_margin_bp ?? 300;

  const { control, handleSubmit, watch, setValue, formState } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const errors = formState.errors;
  const name = watch('name');
  const status = lockedStatus ?? watch('status');
  const firstChargeDate = watch('firstChargeDate');
  const categoryId = watch('categoryId');
  const iconKey = watch('iconKey');
  const amount = watch('amount');
  const periodicity = watch('periodicity');
  const paymentMethod = watch('paymentMethod');
  const marginOverrideBp = watch('marginOverrideBp');

  const [lookupName, setLookupName] = useState(mode === 'create' ? '' : defaultValues.name);
  const [handled, setHandled] = useState<string | null>(mode === 'edit' ? defaultValues.name : null);
  const [classificationTouched, setClassificationTouched] = useState(false);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [shownSheet, setShownSheet] = useState<SheetKind>('category');

  useEffect(() => {
    const timer = setTimeout(() => setLookupName(name), 500);
    return () => clearTimeout(timer);
  }, [name]);

  const suggestion = useSuggestion(mode === 'create' ? lookupName : '');
  const showSuggestion = mode === 'create' && suggestion.data && handled !== lookupName;
  const suggestedCategory = categories.data?.find((c) => c.id === suggestion.data?.categoryId)?.name;
  const categoryName = categories.data?.find((c) => c.id === categoryId)?.name ?? 'Autre';

  const openSheet = (kind: SheetKind) => {
    setShownSheet(kind);
    setSheet(kind);
  };
  const closeSheet = () => setSheet(null);

  const acceptSuggestion = () => {
    const s = suggestion.data;
    if (!s) {
      return;
    }
    haptic.success();
    setValue('categoryId', s.categoryId);
    setValue('iconKey', s.iconKey);
    if (s.cancelUrl && !watch('cancelUrl')) {
      setValue('cancelUrl', s.cancelUrl);
    }
    if (status === 'trial' && s.trialDays) {
      setValue('firstChargeDate', trialEndFrom(s.trialDays, DEFAULT_TRIAL_DAYS), { shouldValidate: true });
    }
    setHandled(lookupName);
    setClassificationTouched(false);
  };

  const pickDate = () =>
    DateTimePickerAndroid.open({
      value: new Date(`${firstChargeDate}T12:00:00`),
      mode: 'date',
      minimumDate: mode === 'create' ? new Date(`${today}T00:00:00`) : undefined,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          setValue('firstChargeDate', toIsoDate(date), { shouldValidate: true });
        }
      },
    });

  const changeStatus = (next: 'trial' | 'active') => {
    setValue('status', next);
    setValue('firstChargeDate', next === 'trial' ? trialEndFrom(suggestion.data?.trialDays ?? null, DEFAULT_TRIAL_DAYS) : today, {
      shouldValidate: true,
    });
  };

  const submit = handleSubmit(
    (values) => {
      const aiSuggestion = suggestion.data?.source === 'ai' ? JSON.stringify(suggestion.data) : null;
      onSubmit(values, classificationTouched ? { categoryId: values.categoryId, iconKey: values.iconKey ?? 'tag' } : null, aiSuggestion);
    },
    () => haptic.error(),
  );

  const amountCents = /^\d/.test(amount) ? parseAmountCents(amount) : 0;
  const effectiveMargin = marginOverrideBp ?? globalMarginBp;
  const funded = amountCents > 0 ? fundedAmountCents(amountCents, effectiveMargin) : 0;
  const period = periodicityOf(periodicity);
  const monthly = isProvisioned(period.unit, period.count) ? ceilDiv(funded, periodMonths(period.unit, period.count)) : null;
  const dateLabel = status === 'trial' ? 'Fin d’essai' : status === 'cancelled' ? 'Dernière échéance' : 'Prochain prélèvement';
  const logoLabel = iconKey && BRAND_ICONS[iconKey] ? BRAND_ICONS[iconKey].title : 'Initiale du nom';

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <XStack px="2" minH={52} items="center" gap="1">
        <ActionButton label="Annuler" variant="ghost" onPress={onCancel} />
        <Heading flex={1} fontSize={20} numberOfLines={1}>
          {title}
        </Heading>
      </XStack>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>
        <Card items="center" gap="4" py="6">
          <YStack
            onPress={() => openSheet('logo')}
            scale="1 press:0.96"
            transition="fast"
            accessibilityRole="button"
            accessibilityLabel={`Logo : ${logoLabel}. Changer`}
          >
            <SubscriptionAvatar name={name || '?'} iconKey={iconKey} size={72} />
            <YStack
              w={28}
              h={28}
              rounded="full"
              items="center"
              justify="center"
              bg="primary"
              borderWidth={2}
              borderColor="surface"
              style={styles.badge}
            >
              <Pencil color={colors.onPrimary} size={13} strokeWidth={2.5} />
            </YStack>
          </YStack>

          <YStack self="stretch" gap="1">
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    setLookupName(field.value);
                  }}
                  placeholder="Nom de l’abonnement"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={styles.name}
                  accessibilityLabel="Nom de l’abonnement"
                />
              )}
            />
            <FieldError center message={errors.name?.message} />
          </YStack>

          <YStack self="stretch" h={1} bg="borderColor" />

          <YStack self="stretch" items="center" gap="1">
            <Caption>{status === 'trial' ? 'Montant après l’essai' : 'Montant'}</Caption>
            <XStack items="center" justify="center" gap="1.5">
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="0,00"
                    placeholderTextColor={colors.border}
                    keyboardType="decimal-pad"
                    style={styles.amount}
                    accessibilityLabel="Montant en euros"
                  />
                )}
              />
              <Text fontSize={30} fontWeight="600" color={amount ? 'color' : 'colorMuted'}>
                €
              </Text>
            </XStack>
            <Caption>{PER[periodicity]}</Caption>
            <FieldError center message={errors.amount?.message} />
          </YStack>
        </Card>

        {showSuggestion && suggestion.data ? (
          <Reveal>
            <Card gap="3" borderColor="primary">
              <XStack gap="2" items="center">
                <Sparkles color={colors.primary} size={16} />
                <Overline color="primary">{SOURCE_LABELS[suggestion.data.source]}</Overline>
              </XStack>
              <XStack gap="3" items="center">
                <SubscriptionAvatar name={lookupName} iconKey={suggestion.data.iconKey} />
                <YStack flex={1} gap="0.5">
                  <Label>{suggestedCategory ?? 'Autre'}</Label>
                  <Caption>
                    {[
                      suggestion.data.trialDays ? `essai usuel ${suggestion.data.trialDays} jours` : null,
                      suggestion.data.cancelUrl ? 'lien de résiliation trouvé' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'catégorie et logo'}
                  </Caption>
                </YStack>
              </XStack>
              <XStack gap="3">
                <ActionButton flex={1} label="Ignorer" variant="outline" onPress={() => setHandled(lookupName)} />
                <ActionButton flex={1} label="Appliquer" variant="primary" onPress={acceptSuggestion} />
              </XStack>
            </Card>
          </Reveal>
        ) : null}

        {!lockedStatus ? (
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Segmented
                label="Statut"
                value={field.value}
                onChange={changeStatus}
                options={[
                  { key: 'trial', label: 'Période d’essai' },
                  { key: 'active', label: 'Déjà actif' },
                ]}
              />
            )}
          />
        ) : null}

        <Group title="Détails">
          <PickerRow icon={Tag} label="Catégorie" value={categoryName} onPress={() => openSheet('category')} />
          <PickerRow
            icon={Repeat}
            label="Périodicité"
            value={PERIODICITIES.find((p) => p.key === periodicity)?.label ?? ''}
            onPress={() => openSheet('periodicity')}
            last={status === 'cancelled'}
          />
          {status !== 'cancelled' ? (
            <PickerRow icon={CalendarDays} label={dateLabel} value={formatDateFr(firstChargeDate)} onPress={pickDate} last />
          ) : null}
        </Group>
        <FieldError message={errors.firstChargeDate?.message} />

        {funded > 0 && paymentMethod === 'revolut' ? (
          <XStack bg="subtle" rounded="xl" p="4" gap="3" items="center">
            <YStack w={40} h={40} rounded="full" bg="secondary" items="center" justify="center">
              <PiggyBank color={colors.primary} size={20} />
            </YStack>
            <YStack flex={1} gap="0.5">
              <Label>{`${formatEuros(funded)} à sortir du coffre`}</Label>
              <Caption>
                {monthly
                  ? `à chaque prélèvement, mis de côté à ${formatEuros(monthly)} par mois · marge ${marginLabel(effectiveMargin)}`
                  : `à chaque prélèvement · marge ${marginLabel(effectiveMargin)}`}
              </Caption>
            </YStack>
          </XStack>
        ) : null}

        {mode === 'edit' ? (
          <Group title="Options">
            <PickerRow
              icon={CreditCard}
              label="Paiement"
              value={PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label ?? ''}
              onPress={() => openSheet('payment')}
            />
            <Row icon={Percent}>
              <YStack flex={1} gap="0.5">
                <Body>Marge</Body>
                {marginOverrideBp === null ? (
                  <Caption>{`globale (${marginLabel(globalMarginBp)})`}</Caption>
                ) : (
                  <Caption
                    color="primary"
                    fontWeight="600"
                    onPress={() => setValue('marginOverrideBp', null)}
                    accessibilityRole="button"
                  >{`Revenir à la globale (${marginLabel(globalMarginBp)})`}</Caption>
                )}
              </YStack>
              <StepButton
                icon={Minus}
                label="Diminuer la marge"
                onPress={() => setValue('marginOverrideBp', Math.max(0, effectiveMargin - 50))}
              />
              <Amount minW={56} text="center" fontWeight="700">
                {marginLabel(effectiveMargin)}
              </Amount>
              <StepButton
                icon={Plus}
                label="Augmenter la marge"
                onPress={() => setValue('marginOverrideBp', Math.min(500, effectiveMargin + 50))}
              />
            </Row>
            <Row icon={Link}>
              <YStack flex={1} gap="0.5">
                <Caption>Lien de résiliation</Caption>
                <Controller
                  control={control}
                  name="cancelUrl"
                  render={({ field }) => (
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="https://…"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                      keyboardType="url"
                      style={styles.inline}
                      accessibilityLabel="Lien de résiliation"
                    />
                  )}
                />
                <FieldError message={errors.cancelUrl?.message} />
              </YStack>
            </Row>
            <Row icon={NotebookPen} last>
              <YStack flex={1} gap="0.5">
                <Caption>Notes</Caption>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Identifiant, offre, rappel…"
                      placeholderTextColor={colors.muted}
                      multiline
                      style={[styles.inline, styles.notes]}
                      accessibilityLabel="Notes"
                    />
                  )}
                />
                <FieldError message={errors.notes?.message} />
              </YStack>
            </Row>
          </Group>
        ) : null}

        {mode === 'create' ? (
          <Caption text="center" px="4">
            Seul le nom est envoyé à l’IA, jamais le montant.
          </Caption>
        ) : null}
        <FieldError message={error ?? undefined} />
      </ScrollView>

      <YStack p="4" pb={insets.bottom + 16} borderTopWidth={1} borderColor="borderColor" bg="surface">
        <ActionButton size="lg" label={busy ? 'Enregistrement…' : submitLabel} loading={busy} onPress={() => submit()} />
      </YStack>

      <BottomSheet open={sheet !== null} title={SHEET_TITLES[shownSheet]} onClose={closeSheet}>
        {shownSheet === 'category'
          ? (categories.data ?? []).map((c, i, all) => (
              <SheetOption
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                last={i === all.length - 1}
                onPress={() => {
                  setValue('categoryId', c.id);
                  setClassificationTouched(true);
                  closeSheet();
                }}
              />
            ))
          : null}
        {shownSheet === 'periodicity'
          ? PERIODICITIES.map((p, i) => (
              <SheetOption
                key={p.key}
                label={p.label}
                selected={periodicity === p.key}
                last={i === PERIODICITIES.length - 1}
                onPress={() => {
                  setValue('periodicity', p.key);
                  closeSheet();
                }}
              />
            ))
          : null}
        {shownSheet === 'payment'
          ? PAYMENT_METHODS.map((m, i) => (
              <SheetOption
                key={m.key}
                label={m.label}
                hint={m.hint}
                selected={paymentMethod === m.key}
                last={i === PAYMENT_METHODS.length - 1}
                onPress={() => {
                  setValue('paymentMethod', m.key);
                  closeSheet();
                }}
              />
            ))
          : null}
        {shownSheet === 'logo' ? (
          <XStack gap="3" flexWrap="wrap" justify="center" pb="2">
            {[null, ...Object.keys(BRAND_ICONS)].map((key) => (
              <YStack
                key={key ?? 'initiale'}
                p="1"
                rounded="xl"
                borderWidth={2}
                borderColor={iconKey === key ? 'primary' : 'surface'}
                scale="1 press:0.94"
                transition="fast"
                onPress={() => {
                  haptic.select();
                  setValue('iconKey', key);
                  setClassificationTouched(true);
                  closeSheet();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: iconKey === key }}
                accessibilityLabel={key ? BRAND_ICONS[key]?.title : 'Initiale du nom'}
              >
                <SubscriptionAvatar name={name || '?'} iconKey={key} size={48} />
              </YStack>
            ))}
          </XStack>
        ) : null}
      </BottomSheet>
    </YStack>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', right: -6, bottom: -6 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', paddingVertical: 4 },
  amount: { fontSize: 44, fontWeight: '700', color: colors.text, padding: 0, minWidth: 40, fontVariant: ['tabular-nums'] },
  inline: { fontSize: 16, color: colors.text, padding: 0 },
  notes: { minHeight: 48, textAlignVertical: 'top' },
});

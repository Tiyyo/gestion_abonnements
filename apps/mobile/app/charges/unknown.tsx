import { formatEuros, todayIn } from '@abonnements/core';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, ScrollView, YStack } from 'tamagui';
import { newId } from '../../db/id';
import { useDb } from '../../db/provider';
import { classifyDebit, recordUnknownDebit } from '../../db/reconcile';
import { useReviewCharge } from '../../features/home';
import { parseAmountCents } from '../../features/subscription-form';
import { ActionButton, Body, DateField, Label, ModalHeader, TOP_GAP } from '../../ui/kit';
import { formatDateFr, formatDayMonth, toIsoDate } from '../../ui/format';
import { requestReschedule } from '../../notifications/scheduler';
import { showDialog, showError } from '../../ui/dialog';

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;

const EVENT_LABELS = {
  unexpected_charge: 'Prélèvement inattendu enregistré.',
  post_cancel_charge: 'Prélèvement après résiliation enregistré. Réclame un remboursement au marchand.',
  duplicate: 'Double prélèvement enregistré. Réclame un remboursement au marchand.',
} as const;

export default function UnknownDebitScreen() {
  const insets = useSafeAreaInsets();
  const today = todayIn();
  const db = useDb();
  const queryClient = useQueryClient();
  const review = useReviewCharge();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 0 && AMOUNT.test(amount.trim()) && parseAmountCents(amount) > 0;

  const done = async (message: string) => {
    await queryClient.invalidateQueries();
    requestReschedule();
    showDialog('Enregistré', message, undefined, { tone: 'ok' });
    router.back();
  };

  const submit = async () => {
    const debit = { name: name.trim(), amountCents: parseAmountCents(amount), date };
    setBusy(true);
    try {
      const outcome = await classifyDebit(db, debit);
      if (outcome.kind === 'matches_charge') {
        showDialog(`C’est le prélèvement ${outcome.name} du ${formatDayMonth(outcome.dueDate)} ?`, undefined, [
          { text: 'Non', style: 'cancel', onPress: () => setBusy(false) },
          {
            text: 'Oui',
            onPress: () =>
              review.mutate(
                { chargeId: outcome.chargeId, answer: { kind: 'paid', amountCents: debit.amountCents, date } },
                { onSuccess: () => done('Prélèvement marqué comme passé.'), onSettled: () => setBusy(false) },
              ),
          },
        ]);
        return;
      }
      await recordUnknownDebit(db, debit, outcome, newId);
      const label = EVENT_LABELS[outcome.type as keyof typeof EVENT_LABELS] ?? 'Débit enregistré.';
      if (outcome.offerCreateSubscription) {
        await queryClient.invalidateQueries();
        showDialog('Prélèvement inattendu', `${formatEuros(debit.amountCents)} débités par ${debit.name}. Créer l’abonnement ?`, [
          { text: 'Non', style: 'cancel', onPress: () => router.back() },
          {
            text: 'Créer',
            onPress: () => router.replace({ pathname: '/subscriptions/new', params: { name: debit.name, amount, date } }),
          },
        ]);
      } else {
        await done(label);
      }
    } catch (error) {
      showError('Enregistrement impossible', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <ModalHeader title="Prélèvement inconnu" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 18 }}>
        <Body color="colorMuted">Un débit vu sur ton relevé Revolut, que l’app ne connaît pas encore.</Body>
        <YStack gap="2">
          <Label>Nom du marchand</Label>
          <Input
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            minH={48}
            fontSize={16}
            bg="surface"
            borderColor="borderControl"
            accessibilityLabel="Nom du marchand"
          />
        </YStack>
        <YStack gap="2">
          <Label>Montant (€)</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            placeholder="9,99"
            keyboardType="decimal-pad"
            minH={48}
            fontSize={16}
            bg="surface"
            borderColor="borderControl"
            accessibilityLabel="Montant"
          />
        </YStack>
        <YStack gap="2">
          <Label>Date du débit</Label>
          <DateField
            label={formatDateFr(date)}
            onPress={() =>
              DateTimePickerAndroid.open({
                value: new Date(`${date}T12:00:00`),
                maximumDate: new Date(`${today}T12:00:00`),
                mode: 'date',
                onChange: (event, picked) => {
                  if (event.type === 'set' && picked) {
                    setDate(toIsoDate(picked));
                  }
                },
              })
            }
          />
        </YStack>
      </ScrollView>
      <YStack p="4" pb={insets.bottom + 16} borderTopWidth={1} borderColor="borderColor" bg="surface">
        <ActionButton size="lg" label="Enregistrer" disabled={!valid} loading={busy} onPress={submit} />
      </YStack>
    </YStack>
  );
}

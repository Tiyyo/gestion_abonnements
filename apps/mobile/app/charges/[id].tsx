import { formatEuros, todayIn } from '@abonnements/core';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, ScrollView, Spinner, XStack, YStack } from 'tamagui';
import { useChargeToReview, useFollowUp, useReviewCharge } from '../../features/home';
import { centsToInput, parseAmountCents } from '../../features/subscription-form';
import { ActionButton, Body, Caption, DateField, Label, ModalHeader, Overline, ScreenTitle, TOP_GAP } from '../../ui/kit';
import { formatDateFr, formatDayMonth, toIsoDate } from '../../ui/format';
import { showDialog, showError } from '../../ui/dialog';

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;

export default function ReviewChargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const today = todayIn();
  const charge = useChargeToReview(id);
  const review = useReviewCharge();
  const followUp = useFollowUp();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const row = charge.data;
  useEffect(() => {
    if (row) {
      setAmount(centsToInput(row.expected_amount_cents));
      setDate(row.due_date < today ? row.due_date : today);
    }
  }, [row, today]);

  if (charge.isPending) {
    return <Spinner flex={1} color="primary" />;
  }
  if (!row) {
    return (
      <YStack flex={1} bg="background" items="center" justify="center" gap="3">
        <Body color="colorMuted">Prélèvement introuvable.</Body>
        <ActionButton label="Retour" variant="outline" onPress={() => router.back()} />
      </YStack>
    );
  }

  const busy = review.isPending || followUp.isPending;
  const validAmount = AMOUNT.test(amount.trim()) && parseAmountCents(amount) > 0;
  const fail = (error: Error) => showError('Action impossible', error.message);
  const subscriptionId = row.subscription_id;

  const askTrialDecision = () =>
    showDialog(
      `Garder ${row.name} ?`,
      'Le prélèvement est passé. Tu peux garder l’abonnement, ou le résilier pour la prochaine échéance.',
      [
        {
          text: 'Résilier',
          style: 'destructive',
          onPress: () => followUp.mutate({ type: 'cancel', subscriptionId }, { onSuccess: () => router.back(), onError: fail }),
        },
        {
          text: 'Garder',
          onPress: () => followUp.mutate({ type: 'keep', subscriptionId }, { onSuccess: () => router.back(), onError: fail }),
        },
      ],
      { tone: 'question', cancelable: false },
    );

  const paid = () => {
    const cents = parseAmountCents(amount);
    review.mutate(
      { chargeId: row.id, answer: { kind: 'paid', amountCents: cents, date } },
      {
        onError: fail,
        onSuccess: (result) => {
          if (result.proposeAmountUpdate && !result.trialDecision) {
            showDialog(
              'Le prix a changé',
              `Mettre à jour le montant de ${row.name} à ${formatEuros(cents)} pour les prochains prélèvements ?`,
              [
                { text: 'Non', style: 'cancel', onPress: () => router.back() },
                {
                  text: 'Mettre à jour',
                  onPress: () =>
                    followUp.mutate(
                      { type: 'amount', subscriptionId, amountCents: cents },
                      { onSuccess: () => router.back(), onError: fail },
                    ),
                },
              ],
            );
          } else if (result.trialDecision) {
            askTrialDecision();
          } else {
            router.back();
          }
        },
      },
    );
  };

  const failed = () => {
    if (row.status === 'unfunded') {
      review.mutate({ chargeId: row.id, answer: { kind: 'failed', choice: 'give_up' } }, { onSuccess: () => router.back(), onError: fail });
      return;
    }
    showDialog('Prélèvement échoué', 'L’argent transféré est resté sur le compte.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Le marchand va retenter',
        onPress: () =>
          review.mutate(
            { chargeId: row.id, answer: { kind: 'failed', choice: 'merchant_will_retry' } },
            {
              onError: fail,
              onSuccess: () => {
                const newAmount = validAmount ? parseAmountCents(amount) : 0;
                if (newAmount <= row.funded_amount_cents) {
                  router.back();
                  return;
                }
                showDialog(
                  'Le prix a augmenté',
                  `Le compte a reçu ${formatEuros(row.funded_amount_cents)}, il manque ${formatEuros(newAmount - row.funded_amount_cents)}. Transfère cette différence du coffre maintenant.`,
                  [
                    { text: 'Plus tard', style: 'cancel', onPress: () => router.back() },
                    {
                      text: 'C’est fait',
                      onPress: () =>
                        followUp.mutate(
                          { type: 'corrective', chargeId: row.id, amountCents: newAmount },
                          { onSuccess: () => router.back(), onError: fail },
                        ),
                    },
                  ],
                  { tone: 'warn' },
                );
              },
            },
          ),
      },
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: () =>
          review.mutate(
            { chargeId: row.id, answer: { kind: 'failed', choice: 'give_up' } },
            { onSuccess: () => router.back(), onError: fail },
          ),
      },
    ]);
  };

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <ModalHeader />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 18 }}>
        <YStack gap="1">
          <Overline>{`Prélèvement prévu le ${formatDayMonth(row.due_date)}`}</Overline>
          <ScreenTitle>{row.name}</ScreenTitle>
          <Body color="colorMuted">
            {row.status === 'unfunded'
              ? 'Ce prélèvement n’était pas financé : il a normalement échoué. Vérifie ton relevé Revolut.'
              : `Attendu ${formatEuros(row.expected_amount_cents)}, financé ${formatEuros(row.funded_amount_cents)}. Vérifie ton relevé Revolut.`}
          </Body>
        </YStack>

        <YStack gap="2">
          <Label>{row.status === 'unfunded' ? 'Montant débité (€)' : 'Montant débité ou nouveau prix (€)'}</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            minH={48}
            fontSize={16}
            bg="surface"
            borderColor="borderControl"
            accessibilityLabel="Montant débité en euros"
          />
          {!validAmount && <Caption color="dangerText">Montant invalide, par exemple 9,99</Caption>}
        </YStack>

        <YStack gap="2">
          <Label>Date du débit</Label>
          <DateField
            label={formatDateFr(date)}
            accessibilityLabel={`Date du débit : ${formatDateFr(date)}. Modifier`}
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

      <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
        <ActionButton flex={1} size="lg" label="Il a échoué" variant="outline" disabled={busy} onPress={failed} />
        <ActionButton flex={1} size="lg" label="Il est passé" disabled={busy || !validAmount} onPress={paid} />
      </XStack>
    </YStack>
  );
}

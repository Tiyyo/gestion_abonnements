import { VaultCoverage } from '../../components/BalancesCard';
import { addDays, formatEuros, todayIn } from '@abonnements/core';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, ChevronRight, ReceiptEuro } from 'lucide-react-native';
import { Button, ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { MonthPlan, PlanTransfer } from '../../db/repositories/plan';
import { useMonthPlan, usePlanAction } from '../../features/plan';
import { formatDayMonth, formatMonthYear, formatPercentBp as marginLabel, formatWeekdayDayMonth } from '../../ui/format';
import {
  ActionButton,
  Amount,
  Body,
  Caption,
  Card,
  colors,
  Display,
  IconButton,
  Label,
  Overline,
  ScreenHeader,
  SectionTitle,
  TOP_GAP,
} from '../../ui/kit';
import { RADIUS } from '../../ui/elevation';
import { Hero } from '../../ui/Hero';
import { TAB_BAR_CLEARANCE } from '../../ui/TabBar';
import { pickRescheduleDate } from '../../ui/reschedule';
import { showDialog, showError } from '../../ui/dialog';
import { Appear, easeOut, haptic } from '../../ui/motion';
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';

function shift(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}

function PaydayCard({ plan, busy, onDone, onUndo }: { plan: MonthPlan; busy: boolean; onDone: () => void; onUndo: () => void }) {
  const { payday } = plan;
  return (
    <Card>
      <Overline>{`Virement de paie · ${formatDayMonth(payday.date)}`}</Overline>
      <Display>{formatEuros(payday.totalCents)}</Display>
      <Caption>Banque → Revolut → coffre</Caption>
      <YStack borderTopWidth={1} borderColor="borderColor" mt="1" pt="3" gap="2">
        {payday.lines.map((line) => (
          <XStack key={`${line.kind}-${line.subscriptionId ?? ''}`} justify="space-between" gap="3">
            <Body color="colorMuted" shrink={1}>
              {line.kind === 'charges'
                ? `Prélèvements du mois (marge ${marginLabel(plan.globalMarginBp)})`
                : `${line.kind === 'provision' ? 'Provision' : 'Complément'} (${line.name ?? '?'})`}
            </Body>
            <Amount>{formatEuros(line.amountCents)}</Amount>
          </XStack>
        ))}
      </YStack>
      <XStack mt="2">
        {payday.done ? (
          <XStack flex={1} items="center" justify="space-between" gap="3">
            <XStack items="center" gap="2">
              <Check color={colors.ok} size={18} strokeWidth={2.5} />
              <Label color="okText">Virement fait</Label>
            </XStack>
            <ActionButton label="Annuler" variant="ghost" size="sm" disabled={busy} onPress={onUndo} />
          </XStack>
        ) : (
          <ActionButton flex={1} label="Marquer le virement fait" variant="outline" disabled={busy} onPress={onDone} />
        )}
      </XStack>
    </Card>
  );
}

function chargeLine(transfer: PlanTransfer, charge: PlanTransfer['charges'][number]): string {
  const when =
    charge.dueDate === addDays(transfer.effectiveDate, 1)
      ? `le ${Number(charge.dueDate.slice(8, 10))}`
      : formatWeekdayDayMonth(charge.dueDate).toLowerCase();
  return `Prélèvement ${when} · ${formatEuros(charge.expectedAmountCents)} + ${marginLabel(charge.marginBp)}`;
}

function TransferLine({
  transfer,
  busy,
  onToggle,
  onMore,
}: {
  transfer: PlanTransfer;
  busy: boolean;
  onToggle: () => void;
  onMore: () => void;
}) {
  const names = transfer.charges.map((c) => c.name).join(', ');
  return (
    <Card p="0" gap="0">
      <XStack items="center" minH={64}>
        <Button
          w={56}
          h={64}
          p="0"
          bg="transparent"
          disabled={busy}
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: transfer.done }}
          accessibilityLabel={`Transfert du ${formatDayMonth(transfer.effectiveDate)}, ${names}`}
        >
          <YStack
            w={26}
            h={26}
            rounded="full"
            borderWidth={2}
            borderColor={transfer.done ? 'okText' : 'borderControl'}
            bg={transfer.done ? 'okText' : 'transparent'}
            items="center"
            justify="center"
            transition="smooth"
          >
            {transfer.done && (
              <Animated.View entering={ZoomIn.duration(160).easing(easeOut)}>
                <Check color={colors.onPrimary} size={16} strokeWidth={3} />
              </Animated.View>
            )}
          </YStack>
        </Button>
        <YStack flex={1} py="3" gap="0.5" onPress={onMore} accessibilityRole="button" accessibilityHint="Reporter ou annuler">
          <Label color={transfer.done ? 'colorMuted' : 'color'} textDecorationLine={transfer.done ? 'line-through' : 'none'}>
            {`${formatWeekdayDayMonth(transfer.effectiveDate)} · ${names}`}
          </Label>
          {transfer.rescheduled && <Caption color="warnText">{`Reporté (prévu le ${formatDayMonth(transfer.plannedDate)})`}</Caption>}
          {transfer.charges.map((c) => (
            <Caption key={`${c.name}-${c.dueDate}`}>{chargeLine(transfer, c)}</Caption>
          ))}
        </YStack>
        <Amount px="4" fontSize={16} color={transfer.done ? 'colorMuted' : 'color'}>
          {formatEuros(transfer.amountCents)}
        </Amount>
      </XStack>
    </Card>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const today = todayIn();
  const [[year, month], setMonth] = useState<[number, number]>(() => [Number(today.slice(0, 4)), Number(today.slice(5, 7))]);
  const [direction, setDirection] = useState(1);
  const goMonth = (delta: 1 | -1) => {
    haptic.select();
    setDirection(delta);
    setMonth(shift(year, month, delta));
  };
  const plan = useMonthPlan(year, month);
  const action = usePlanAction();
  const busy = action.isPending;
  const run = (input: Parameters<typeof action.mutate>[0]) =>
    action.mutate(input, { onError: (error) => showError('Action impossible', error.message) });

  const reschedule = (transfer: PlanTransfer) =>
    pickRescheduleDate(transfer, today, (date) => run({ type: 'reschedule', transferId: transfer.id, date }));

  const more = (transfer: PlanTransfer) => {
    if (transfer.done) {
      showDialog('Transfert fait', 'Le remettre en « à faire » ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Remettre à faire', onPress: () => run({ type: 'transfer_undo', transferId: transfer.id }) },
      ]);
      return;
    }
    showDialog(`Transfert du ${formatDayMonth(transfer.effectiveDate)}`, undefined, [
      { text: 'Fermer', style: 'cancel' },
      ...(transfer.rescheduled
        ? [{ text: 'Annuler le report', onPress: () => run({ type: 'reschedule', transferId: transfer.id, date: null }) }]
        : []),
      { text: 'Reporter', onPress: () => reschedule(transfer) },
    ]);
  };

  const data = plan.data;
  const risky = data?.trials.filter((t) => t.risk) ?? [];

  return (
    <YStack flex={1} bg="background">
      {focused ? <StatusBar style="light" /> : null}
      <Hero pt={insets.top + TOP_GAP.tab} pb="4" gap="4">
        <ScreenHeader
          onHero
          title="Plan du mois"
          trailing={
            <IconButton
              icon={ReceiptEuro}
              label="Saisir un prélèvement inconnu"
              variant="glass"
              onPress={() => router.push('/charges/unknown')}
            />
          }
        />
        <XStack
          mx="4"
          items="center"
          justify="space-between"
          bg="glassInner"
          borderWidth={1}
          borderColor="glassEdge"
          rounded={RADIUS.control + 4}
          p="1"
        >
          <IconButton icon={ChevronLeft} label="Mois précédent" variant="glass" onPress={() => goMonth(-1)} />
          <Label fontSize={17} color="onGlass" accessibilityRole="header">
            {formatMonthYear(year, month)}
          </Label>
          <IconButton icon={ChevronRight} label="Mois suivant" variant="glass" onPress={() => goMonth(1)} />
        </XStack>
      </Hero>

      {!data ? (
        <Spinner mt="8" color="primary" />
      ) : (
        <Animated.View
          key={`${year}-${month}`}
          style={{ flex: 1 }}
          entering={(direction > 0 ? FadeInRight : FadeInLeft)
            .duration(180)
            .easing(easeOut)
            .withInitialValues({ opacity: 0, transform: [{ translateX: direction * 10 }] })}
        >
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
            <PaydayCard
              plan={data}
              busy={busy}
              onDone={() => {
                haptic.success();
                run({ type: 'payday_done', period: data.period });
              }}
              onUndo={() =>
                showDialog('Virement de paie', 'Annuler le virement marqué fait ? Les provisions de ce mois seront retirées.', [
                  { text: 'Non', style: 'cancel' },
                  {
                    text: 'Annuler le virement',
                    style: 'destructive',
                    onPress: () => run({ type: 'payday_undo', transferId: data.payday.transferId ?? '' }),
                  },
                ])
              }
            />

            <SectionTitle>Transferts coffre → compte</SectionTitle>
            <VaultCoverage remainingCents={data.transfers.filter((t) => !t.done).reduce((sum, t) => sum + t.amountCents, 0)} />
            {data.transfers.length === 0 ? (
              <Body color="colorMuted">Aucun transfert sur cette période.</Body>
            ) : (
              data.transfers.map((t, index) => (
                <Appear key={t.id} index={index}>
                  <TransferLine
                    transfer={t}
                    busy={busy}
                    onToggle={() => {
                      if (t.done) {
                        more(t);
                        return;
                      }
                      haptic.success();
                      run({ type: 'transfer_done', transferId: t.id });
                    }}
                    onMore={() => more(t)}
                  />
                </Appear>
              ))
            )}

            {data.trials.length > 0 && (
              <Card tone={risky.length > 0 ? 'warn' : 'ok'}>
                <Overline color={risky.length > 0 ? 'warnText' : 'okText'}>
                  {risky.length > 0 ? 'Risque d’essai oublié' : 'Risque d’essai oublié : aucun'}
                </Overline>
                {data.trials.map((t) => (
                  <Body key={t.name + t.dueDate} color={t.risk ? 'warnText' : 'okText'}>
                    {t.risk
                      ? `${t.name} (${formatEuros(t.amountCents)}) pourrait passer le ${formatDayMonth(t.dueDate)} : le compte aura environ ${formatEuros(t.projectedCents)}. Décide avant, ou reporte le transfert de ce jour-là.`
                      : `${t.name} (${formatEuros(t.amountCents)}) dépasse le solde prévu de ${formatEuros(Math.max(0, t.projectedCents))}, il échouera.`}
                  </Body>
                ))}
              </Card>
            )}

            {data.residualCents !== null && (
              <Card>
                <Overline>{`Résidu estimé · ${formatDayMonth(today)}`}</Overline>
                {data.residualCents === 0 ? (
                  <Body color="colorMuted">Rien à renvoyer au coffre pour l’instant.</Body>
                ) : (
                  <XStack items="center" justify="space-between" gap="3">
                    <Label flex={1}>{`${formatEuros(data.residualCents)} à renvoyer au coffre`}</Label>
                    <ActionButton
                      label="Renvoyer"
                      variant="outline"
                      disabled={busy}
                      onPress={() =>
                        showDialog('Renvoyer au coffre', `As-tu renvoyé ${formatEuros(data.residualCents ?? 0)} au coffre ?`, [
                          { text: 'Non', style: 'cancel' },
                          { text: 'Oui, c’est fait', onPress: () => run({ type: 'residual', amountCents: data.residualCents ?? 0 }) },
                        ])
                      }
                    />
                  </XStack>
                )}
              </Card>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </YStack>
  );
}

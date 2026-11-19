import { diffDays, formatEuros, todayIn } from '@abonnements/core';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChartColumn } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Linking, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { HomeQuestion } from '../../db/repositories/home';
import type { PlanTransfer, PlanTrial } from '../../db/repositories/plan';
import { BalancesCard } from '../../components/BalancesCard';
import { balancesKey } from '../../features/balances';
import { useDailyMaintenance, useFollowUp, useHome, useReviewCharge } from '../../features/home';
import { usePlanAction } from '../../features/plan';
import { useSubscriptionTransitionFor } from '../../features/subscription-detail';
import { formatDayMonth, formatWeekdayDayMonth } from '../../ui/format';
import {
  ActionButton,
  Amount,
  Body,
  Caption,
  Card,
  colors,
  CardTitle,
  Display,
  EmptyState,
  IconButton,
  Label,
  ListCard,
  Overline,
  ScreenHeader,
  SectionTitle,
  TOP_GAP,
} from '../../ui/kit';
import { pickRescheduleDate } from '../../ui/reschedule';
import { showDialog, showError } from '../../ui/dialog';
import { Hero } from '../../ui/Hero';
import { Appear } from '../../ui/motion';
import { TAB_BAR_CLEARANCE } from '../../ui/TabBar';

const HERO_OVERLAP = 56;

const MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

type HomeTone = 'accent' | 'warn' | 'danger' | 'plain';

const FG: Record<HomeTone, { fg: string; muted: string }> = {
  accent: { fg: 'color', muted: 'colorMuted' },
  warn: { fg: 'color', muted: 'warnText' },
  danger: { fg: 'dangerText', muted: 'dangerText' },
  plain: { fg: 'color', muted: 'colorMuted' },
};

function HomeCard({
  tone,
  caption,
  title,
  body,
  actions,
}: {
  tone: HomeTone;
  caption: string;
  title?: string;
  body?: string;
  actions?: ReactNode;
}) {
  const t = FG[tone];
  return (
    <Card tone={tone === 'accent' ? 'plain' : tone} lift={tone === 'accent'}>
      <Overline color={t.muted as 'color'}>{caption}</Overline>
      {title && (tone === 'accent' ? <Display color="primary">{title}</Display> : <CardTitle color={t.fg as 'color'}>{title}</CardTitle>)}
      {body && <Body color={t.fg as 'color'}>{body}</Body>}
      {actions && (
        <XStack gap="3" mt="2">
          {actions}
        </XStack>
      )}
    </Card>
  );
}

function transferPurpose(transfer: PlanTransfer): string {
  const names = transfer.charges.map((c) => c.name).join(', ');
  const due = transfer.charges.map((c) => `le ${Number(c.dueDate.slice(8, 10))}`).join(', ');
  return `Coffre → compte principal, pour ${names} (prélevé ${due})`;
}

function whenLabel(date: string, today: string): string {
  const days = diffDays(today, date);
  if (days === 0) {
    return `aujourd’hui ${formatDayMonth(date)}`;
  }
  if (days === 1) {
    return `demain ${formatDayMonth(date)}`;
  }
  return formatWeekdayDayMonth(date);
}

function TrialCard({
  trial,
  today,
  busy,
  onKeep,
  onCancel,
}: {
  trial: PlanTrial;
  today: string;
  busy: boolean;
  onKeep: () => void;
  onCancel: () => void;
}) {
  const days = diffDays(today, trial.dueDate);
  const when = days > 1 ? `fin dans ${days} jours` : days === 1 ? 'fin demain' : 'fin aujourd’hui';
  return (
    <HomeCard
      tone="warn"
      caption={`Essai · ${when}`}
      title={`${trial.name} · ${formatDayMonth(trial.dueDate)}`}
      body={
        trial.risk
          ? `${formatEuros(trial.amountCents)} ensuite. Attention : le compte aura environ ${formatEuros(trial.projectedCents)} ce jour-là, le prélèvement pourrait passer.`
          : `${formatEuros(trial.amountCents)} ensuite. Non financé : le prélèvement échouera si tu ne fais rien.`
      }
      actions={
        <>
          <ActionButton flex={1} label="Garder" variant="outline" disabled={busy} onPress={onKeep} />
          <ActionButton flex={1} label="Résilier" variant="warn" disabled={busy} onPress={onCancel} />
        </>
      }
    />
  );
}

function QuestionCard({
  question,
  busy,
  onAnswer,
}: {
  question: HomeQuestion;
  busy: boolean;
  onAnswer: (answer: 'paid' | 'failed' | 'confirm' | 'open') => void;
}) {
  if (question.kind === 'trial_outcome') {
    return (
      <HomeCard
        tone="warn"
        caption={`Fin d’essai le ${formatDayMonth(question.date)}`}
        title={`${question.name} : prélèvement passé ?`}
        body={`Le prélèvement de ${formatEuros(question.amountCents)} n’était pas financé. Vérifie ton relevé Revolut.`}
        actions={
          <>
            <ActionButton flex={1} label="Il a échoué" variant="outline" disabled={busy} onPress={() => onAnswer('failed')} />
            <ActionButton flex={1} label="Il est passé" variant="warn" disabled={busy} onPress={() => onAnswer('paid')} />
          </>
        }
      />
    );
  }
  return (
    <HomeCard
      tone="warn"
      caption={`Fin de période le ${formatDayMonth(question.date)}`}
      title={`As-tu bien résilié ${question.name} ?`}
      body="Tant que ce n’est pas fait, ses prélèvements restent non financés."
      actions={
        <>
          {question.cancelUrl ? (
            <ActionButton flex={1} label="Ouvrir le lien" variant="outline" disabled={busy} onPress={() => onAnswer('open')} />
          ) : null}
          <ActionButton flex={1} label="Oui, résilié" variant="warn" disabled={busy} onPress={() => onAnswer('confirm')} />
        </>
      }
    />
  );
}

export default function HomeScreen() {
  useDailyMaintenance();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const today = todayIn();
  const home = useHome();
  const planAction = usePlanAction();
  const review = useReviewCharge();
  const followUp = useFollowUp();
  const lifecycle = useSubscriptionTransitionFor();
  const busy = planAction.isPending || review.isPending || followUp.isPending || lifecycle.isPending;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onError = { onError: (error: Error) => showError('Action impossible', error.message) };

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const answer = (question: HomeQuestion, kind: 'paid' | 'failed' | 'confirm' | 'open') => {
    if (kind === 'open' && question.cancelUrl) {
      Linking.openURL(question.cancelUrl);
    } else if (kind === 'confirm') {
      followUp.mutate({ type: 'confirm_cancel', subscriptionId: question.subscriptionId }, onError);
    } else if (kind === 'paid' && question.chargeId) {
      router.push(`/charges/${question.chargeId}`);
    } else if (kind === 'failed' && question.chargeId) {
      review.mutate({ chargeId: question.chargeId, answer: { kind: 'failed', choice: 'give_up' } }, onError);
    }
  };

  const data = home.data;
  const pendingTransfersCents = data ? data.overdue.reduce((sum, t) => sum + t.amountCents, 0) + (data.next?.amountCents ?? 0) : 0;
  const refresh = () => {
    setRefreshing(true);
    Promise.all([home.refetch(), queryClient.refetchQueries({ queryKey: balancesKey })]).finally(() => setRefreshing(false));
  };
  return (
    <YStack flex={1} bg="background">
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} progressViewOffset={insets.top} />
        }
      >
        <Hero pt={insets.top + TOP_GAP.tab} pb={HERO_OVERLAP + 20} gap="4">
          <ScreenHeader
            onHero
            overline={dateLabel}
            title="À venir"
            trailing={<IconButton icon={ChartColumn} label="Statistiques" variant="glass" onPress={() => router.push('/stats')} />}
          />
          {data && !data.isEmpty ? (
            <YStack px="4">
              <BalancesCard pendingTransfersCents={pendingTransfersCents} />
            </YStack>
          ) : null}
        </Hero>

        <YStack px="4" gap="3" mt={-HERO_OVERLAP}>
          {!data ? (
            <Spinner mt="8" color="primary" />
          ) : data.isEmpty ? (
            <EmptyState
              message="Ajoute tes abonnements pour voir ici les transferts à faire et les essais à surveiller."
              action={<ActionButton label="Ajouter un premier abonnement" onPress={() => router.push('/subscriptions/new')} />}
            />
          ) : (
            <>
              {data.overdue.map((t, index) => (
                <Appear key={t.id} index={index}>
                  <HomeCard
                    tone="danger"
                    caption={`Transfert en retard · prévu ${formatWeekdayDayMonth(t.effectiveDate)}`}
                    title={formatEuros(t.amountCents)}
                    body={transferPurpose(t)}
                    actions={
                      <ActionButton
                        flex={1}
                        label="Marquer fait"
                        variant="danger"
                        disabled={busy}
                        onPress={() => planAction.mutate({ type: 'transfer_done', transferId: t.id }, onError)}
                      />
                    }
                  />
                </Appear>
              ))}

              {data.next && (
                <Appear key={data.next.id} index={data.overdue.length}>
                  <HomeCard
                    tone="accent"
                    caption={`Prochain transfert · ${whenLabel(data.next.effectiveDate, today)}`}
                    title={formatEuros(data.next.amountCents)}
                    body={transferPurpose(data.next)}
                    actions={
                      <>
                        <ActionButton
                          flex={1}
                          label="Marquer fait"
                          variant="primary"
                          disabled={busy}
                          onPress={() => data.next && planAction.mutate({ type: 'transfer_done', transferId: data.next.id }, onError)}
                        />
                        <ActionButton
                          flex={1}
                          label="Reporter"
                          variant="soft"
                          disabled={busy}
                          onPress={() =>
                            data.next &&
                            pickRescheduleDate(data.next, today, (date) =>
                              planAction.mutate({ type: 'reschedule', transferId: data.next?.id ?? '', date }, onError),
                            )
                          }
                        />
                      </>
                    }
                  />
                </Appear>
              )}

              {data.questions.map((q, index) => (
                <Appear key={`${q.kind}-${q.subscriptionId}`} index={index + 1}>
                  <QuestionCard question={q} busy={busy} onAnswer={(kind) => answer(q, kind)} />
                </Appear>
              ))}

              {data.trials.map((trial, index) => (
                <Appear key={trial.subscriptionId} index={index + 1}>
                  <TrialCard
                    trial={trial}
                    today={today}
                    busy={busy}
                    onKeep={() => lifecycle.mutate({ subscriptionId: trial.subscriptionId, action: { type: 'keep_trial' } }, onError)}
                    onCancel={() =>
                      showDialog(
                        `Résilier ${trial.name} ?`,
                        'Le prélèvement prévu sera supprimé. Pense à résilier aussi chez le marchand.',
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Résilier',
                            style: 'destructive',
                            onPress: () =>
                              lifecycle.mutate({ subscriptionId: trial.subscriptionId, action: { type: 'cancel_trial' } }, onError),
                          },
                        ],
                      )
                    }
                  />
                </Appear>
              ))}

              {data.toReview.length > 0 && (
                <>
                  <SectionTitle>À vérifier</SectionTitle>
                  {data.toReview.map((r, index) => (
                    <Appear key={r.chargeId} index={index + 2}>
                      <ListCard onPress={() => router.push(`/charges/${r.chargeId}`)}>
                        <YStack flex={1} gap="0.5">
                          <Label>{r.name}</Label>
                          <Caption>{`Prévu le ${formatDayMonth(r.dueDate)} · ${r.wanted ? 'passé ou échoué ?' : 'non financé, a-t-il échoué ?'}`}</Caption>
                        </YStack>
                        <Amount>{formatEuros(r.expectedAmountCents)}</Amount>
                      </ListCard>
                    </Appear>
                  ))}
                </>
              )}

              <SectionTitle action={<ActionButton label="Tout voir" variant="ghost" size="sm" onPress={() => router.navigate('/plan')} />}>
                Prochains prélèvements
              </SectionTitle>
              {data.upcoming.length === 0 ? (
                <Body color="colorMuted">Aucun prélèvement financé à venir.</Body>
              ) : (
                data.upcoming.map((u, index) => (
                  <Appear key={u.chargeId} index={index + 2}>
                    <ListCard
                      onPress={() => router.push(`/subscriptions/${u.subscriptionId}`)}
                      accessibilityLabel={`${u.name}, prélevé le ${formatDayMonth(u.dueDate)}, ${formatEuros(u.amountCents)}. Ouvrir la fiche`}
                    >
                      <YStack w={44} items="center">
                        <Amount fontSize={20} fontWeight="700">
                          {Number(u.dueDate.slice(8, 10))}
                        </Amount>
                        <Overline fontSize={11}>{MONTHS_SHORT[Number(u.dueDate.slice(5, 7)) - 1]}</Overline>
                      </YStack>
                      <YStack flex={1} gap="0.5">
                        <Label>{u.name}</Label>
                        <Caption color={u.funded ? 'okText' : 'colorMuted'}>
                          {u.funded
                            ? `Alimenté · ${formatEuros(u.fundedAmountCents)}`
                            : u.transferDate
                              ? `Transfert ${formatWeekdayDayMonth(u.transferDate).toLowerCase()} · ${formatEuros(u.fundedAmountCents)}`
                              : 'Pas de transfert prévu'}
                        </Caption>
                      </YStack>
                      <Amount>{formatEuros(u.amountCents)}</Amount>
                    </ListCard>
                  </Appear>
                ))
              )}
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

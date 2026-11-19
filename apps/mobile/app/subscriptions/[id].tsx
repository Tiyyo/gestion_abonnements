import {
  ceilDiv,
  diffDays,
  effectiveMarginBp,
  formatEuros,
  fundedAmountCents,
  isProvisioned,
  type LifecycleAction,
  periodMonths,
  suggestedPeriodEnd,
} from '@abonnements/core';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, XStack, YStack } from 'tamagui';
import { useArchiveSubscription, useSubscriptionDetail, useSubscriptionTransition } from '../../features/subscription-detail';
import { formatDayMonth, formatPercentBp } from '../../ui/format';
import { eventLabel } from '../../ui/history';
import { ActionButton, Body, Caption, Card, Heading, KeyValue, Label, Overline, ScreenTitle, StackHeader, TOP_GAP } from '../../ui/kit';
import { StatusBadge } from '../../ui/StatusBadge';
import { SubscriptionAvatar } from '../../ui/SubscriptionAvatar';
import { showDialog, showError } from '../../ui/dialog';

const PERIOD_LABELS: Record<string, string> = { week: 'semaine', month: 'mois', year: 'an' };

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function pickDate(initial: string, minimum: string, onPick: (date: string) => void) {
  DateTimePickerAndroid.open({
    value: new Date(`${initial}T12:00:00`),
    minimumDate: new Date(`${minimum}T00:00:00`),
    mode: 'date',
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        onPick(toIso(date));
      }
    },
  });
}

function longDate(date: string): string {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Row({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return typeof children === 'string' ? (
    <KeyValue label={label} value={children} last={last} />
  ) : (
    <KeyValue label={label} last={last}>
      {children}
    </KeyValue>
  );
}

function Notice({ tone, title, children }: { tone: 'warn' | 'danger'; title: string; children: string }) {
  const fg = tone === 'warn' ? 'warnText' : 'dangerText';
  return (
    <Card tone={tone} p="3" gap="1">
      <Overline color={fg}>{title}</Overline>
      <Body color={fg}>{children}</Body>
    </Card>
  );
}

const TONE_VARIANT = { primary: 'primary', danger: 'danger', neutral: 'outline' } as const;

function DetailButton({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'neutral';
  disabled?: boolean;
}) {
  return <ActionButton flex={1} size="lg" label={label} variant={TONE_VARIANT[tone]} disabled={disabled} onPress={onPress} />;
}

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const detail = useSubscriptionDetail(id);
  const transition = useSubscriptionTransition(id);
  const archive = useArchiveSubscription(id);

  if (detail.isPending) {
    return <Spinner flex={1} color="primary" />;
  }
  if (!detail.data) {
    return (
      <YStack flex={1} bg="background" items="center" justify="center" gap="3">
        <Body color="colorMuted">Abonnement introuvable.</Body>
        <DetailButton label="Retour" tone="neutral" onPress={() => router.back()} />
      </YStack>
    );
  }

  const { row, settings, nextCharge, history, provisionedCents, trialRisk, today } = detail.data;
  const margin = effectiveMarginBp(row.margin_override_bp, settings.global_margin_bp);
  const funded = fundedAmountCents(row.amount_cents, margin);
  const busy = transition.isPending || archive.isPending;
  const run = (action: LifecycleAction) => transition.mutate(action, { onError: (error) => showError('Action impossible', error.message) });

  const confirm = (title: string, message: string, label: string, onConfirm: () => void) =>
    showDialog(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: label, style: 'destructive', onPress: onConfirm },
    ]);

  const rhythm = `${formatEuros(row.amount_cents)} / ${row.period_count > 1 ? `${row.period_count} ` : ''}${PERIOD_LABELS[row.period_unit]}${row.period_unit === 'year' && row.period_count > 1 ? 's' : ''}`;
  const cancelLink = row.cancel_url ? (
    <ActionButton
      label="Ouvrir"
      variant="ghost"
      size="sm"
      accessibilityLabel="Ouvrir le lien de résiliation"
      onPress={() => Linking.openURL(row.cancel_url ?? '')}
    />
  ) : (
    'Non renseigné'
  );

  let notice: ReactNode = null;
  let rows: ReactNode;
  let actions: ReactNode;

  if (row.status === 'trial' && row.trial_end_date) {
    const days = diffDays(today, row.trial_end_date);
    const when = days > 1 ? `dans ${days} jours` : days === 1 ? 'demain' : days === 0 ? 'aujourd’hui' : 'passée';
    notice = (
      <Notice tone="warn" title={`Fin d’essai ${when}`}>
        {trialRisk
          ? `Attention : le compte aura assez d’argent ce jour-là, le prélèvement de ${formatEuros(row.amount_cents)} du ${formatDayMonth(row.trial_end_date)} pourrait passer. Décide avant.`
          : `Non financé : sans décision de ta part, le prélèvement de ${formatEuros(row.amount_cents)} du ${formatDayMonth(row.trial_end_date)} échouera.`}
      </Notice>
    );
    rows = (
      <>
        <Row label="Fin d’essai">{longDate(row.trial_end_date)}</Row>
        <Row label="Montant après essai">{rhythm}</Row>
        <Row label="À sortir du coffre si gardé">{`${formatEuros(funded)} (marge ${formatPercentBp(margin)})`}</Row>
      </>
    );
    actions = (
      <>
        <DetailButton label="Garder (passer en actif)" disabled={busy} onPress={() => run({ type: 'keep_trial' })} />
        <DetailButton
          label="Résilier"
          tone="danger"
          disabled={busy}
          onPress={() =>
            confirm('Résilier l’essai ?', 'Le prélèvement prévu sera supprimé. Pense à résilier aussi chez le marchand.', 'Résilier', () =>
              run({ type: 'cancel_trial' }),
            )
          }
        />
      </>
    );
  } else if (row.status === 'to_cancel' && row.period_end_date) {
    notice = (
      <Notice tone="danger" title={`Fin de période le ${formatDayMonth(row.period_end_date)}`}>
        {row.cancel_done
          ? 'Résiliation confirmée : l’abonnement passera en résilié après cette date.'
          : 'Les prélèvements suivants ne sont plus financés. Pense à résilier chez le marchand.'}
      </Notice>
    );
    rows = (
      <>
        <Row label="Montant">{rhythm}</Row>
        <Row label="Fin de période">{longDate(row.period_end_date)}</Row>
        <Row label="Résiliation chez le marchand">{row.cancel_done ? 'Faite' : 'À faire'}</Row>
      </>
    );
    actions = (
      <>
        {!row.cancel_done && <DetailButton label="J’ai résilié" disabled={busy} onPress={() => run({ type: 'confirm_cancel_done' })} />}
        <DetailButton label="Annuler la décision" tone="neutral" disabled={busy} onPress={() => run({ type: 'undo_stop' })} />
      </>
    );
  } else if (row.status === 'cancelled') {
    rows = <Row label="Montant">{rhythm}</Row>;
    actions = (
      <>
        <DetailButton
          label="Réactiver"
          disabled={busy}
          onPress={() => pickDate(today, today, (date) => run({ type: 'reactivate', nextChargeDate: date }))}
        />
        <DetailButton
          label="Supprimer"
          tone="danger"
          disabled={busy}
          onPress={() =>
            confirm(
              'Supprimer l’abonnement ?',
              'Il disparaîtra des listes et des statistiques. Son historique reste dans l’export.',
              'Supprimer',
              () => archive.mutate(undefined, { onSuccess: () => router.back() }),
            )
          }
        />
      </>
    );
  } else {
    const provision = isProvisioned(row.period_unit, row.period_count)
      ? ceilDiv(funded, periodMonths(row.period_unit, row.period_count))
      : null;
    rows = (
      <>
        <Row label="Montant">{rhythm}</Row>
        <Row label="Prochain prélèvement">{longDate(row.next_charge_date)}</Row>
        <Row label="Transfert prévu">
          {nextCharge?.transfer_date
            ? `${formatDayMonth(nextCharge.transfer_date)} · ${formatEuros(nextCharge.funded_amount_cents)}`
            : 'Aucun'}
        </Row>
        <Row label="Marge appliquée">{`${formatPercentBp(margin)}${row.margin_override_bp === null ? ' (globale)' : ''}`}</Row>
        {provision !== null && <Row label="Provision mensuelle">{formatEuros(provision)}</Row>}
        {provision !== null && <Row label="Provision cumulée">{`${formatEuros(provisionedCents)} / ${formatEuros(funded)}`}</Row>}
      </>
    );
    actions = (
      <DetailButton
        label="Arrêter"
        tone="danger"
        disabled={busy}
        onPress={() =>
          pickDate(suggestedPeriodEnd(row.next_charge_date) < today ? today : suggestedPeriodEnd(row.next_charge_date), today, (date) =>
            run({ type: 'stop', periodEndDate: date }),
          )
        }
      />
    );
  }

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <StackHeader
        trailing={<ActionButton label="Modifier" variant="ghost" onPress={() => router.push(`/subscriptions/edit/${row.id}`)} />}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 16 }}>
        <XStack gap="3" items="center">
          <SubscriptionAvatar name={row.name} iconKey={row.icon_key} size={56} />
          <YStack flex={1} gap="0.5">
            <ScreenTitle numberOfLines={2}>{row.name}</ScreenTitle>
            <Body color="colorMuted">{row.category_name}</Body>
          </YStack>
          <StatusBadge status={row.status} />
        </XStack>

        {notice}

        <Card py="0" gap="0">
          {rows}
          <Row label="Moyen de paiement">{row.payment_method === 'revolut' ? 'Revolut' : 'Autre (non financé)'}</Row>
          {row.notes ? <Row label="Notes">{row.notes}</Row> : null}
          <Row label="Lien de résiliation" last>
            {cancelLink}
          </Row>
        </Card>

        <YStack gap="3">
          <Heading>Historique</Heading>
          {history.map((item, index) => (
            <XStack key={item.id} gap="3" items="flex-start">
              <YStack w={10} h={10} mt="1.5" rounded="full" bg={index === 0 ? 'primary' : 'borderControl'} />
              <YStack flex={1} gap="0.5">
                <Label>
                  {item.kind === 'event'
                    ? eventLabel(item.event.type, item.event.payload, item.event.amount_cents)
                    : item.reminder.kind === 'trial_end'
                      ? 'Rappel de fin d’essai'
                      : 'Rappel de résiliation'}
                </Label>
                <Caption>
                  {item.kind === 'event' ? formatDayMonth(item.date) : `${formatDayMonth(item.date)} · notification envoyée`}
                </Caption>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </ScrollView>

      <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
        {actions}
      </XStack>
    </YStack>
  );
}

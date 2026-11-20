import { formatEuros } from '@abonnements/core';

const STATUS_LABELS: Record<string, string> = {
  trial: 'en essai',
  active: 'actif',
  to_cancel: 'à résilier',
  cancelled: 'résilié',
};

export function eventLabel(type: string, payloadJson: string, amountCents: number | null): string {
  const payload = JSON.parse(payloadJson) as { from?: string | null; to?: string; chargeId?: string };
  switch (type) {
    case 'status_change':
      if (payload.from === null || payload.from === undefined) {
        return `Abonnement ajouté (${STATUS_LABELS[payload.to ?? ''] ?? payload.to})`;
      }
      if (payload.from === 'to_cancel' && payload.to === 'active') {
        return 'Décision d’arrêt annulée';
      }
      if (payload.from === 'cancelled' && payload.to === 'active') {
        return 'Abonnement réactivé';
      }
      return `Passé ${STATUS_LABELS[payload.to ?? ''] ?? payload.to}`;
    case 'price_change':
      return `Prix modifié : ${formatEuros(Number(payload.from))} → ${formatEuros(Number(payload.to))}`;
    case 'unexpected_charge':
      return `Prélèvement inattendu${amountCents !== null ? ` de ${formatEuros(amountCents)}` : ''}`;
    case 'duplicate':
      return 'Double prélèvement';
    case 'post_cancel_charge':
      return 'Prélèvement après résiliation';
    case 'charge_failed':
      return 'Prélèvement échoué';
    case 'note':
      return (payload as { kind?: string }).kind === 'review_again' ? 'Prélèvement échoué, le marchand va retenter' : 'Note';
    default:
      return 'Note';
  }
}

export function reminderLabel(kind: string): string {
  return kind === 'trial_end' ? 'Rappel de fin d’essai' : 'Rappel de résiliation';
}

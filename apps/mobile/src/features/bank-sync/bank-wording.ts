import { formatEuros } from '@abonnements/core';
import type { BankHint } from '@/db/repositories/bank-transactions';
import type { HomeUnexpectedDebit } from '@/db/repositories/home/types';
import { dateShort, endSentence } from '@/lib/dates';

/** Libellé du relevé à afficher, y compris quand la banque n'en donne aucun. */
export function debitLabel(label: string): string {
  return label.trim() || 'Débit sans libellé';
}

export function unexpectedDebitTitle(debit: HomeUnexpectedDebit): string {
  return `${debitLabel(debit.label)} · ${formatEuros(debit.amountCents)}`;
}

/** Ce que l'app sait du débit non prévu, selon le classement du prélèvement inconnu (10.5). */
export function unexpectedDebitBody(debit: HomeUnexpectedDebit): string {
  const seen = `Débité le ${dateShort(debit.date)} sur Revolut.`;
  switch (debit.kind) {
    case 'matches_charge':
      return `${seen} C’est peut-être un prélèvement ${debit.name} que Sluis attendait.`;
    case 'post_cancel_charge':
      return `${seen} ${debit.name} est pourtant résilié.`;
    case 'duplicate':
      return `${seen} ${debit.name} a déjà été prélevé récemment : c’est peut-être un doublon.`;
    default:
      return `${seen} Sluis n’attendait pas ce prélèvement.`;
  }
}

/** Titre et texte de l'encart « vu sur Revolut » de l'écran de rapprochement. */
export function bankHintNotice(hint: BankHint): { title: string; body: string } {
  if (hint.kind === 'debit') {
    return {
      title: 'Débit vu sur Revolut',
      body: `${endSentence(`${debitLabel(hint.label)} · ${formatEuros(hint.amountCents)} le ${dateShort(hint.date)}`)} Le montant et la date sont préremplis : confirme si c’est bien ce prélèvement.`,
    };
  }
  return {
    title: 'Aucun débit vu sur Revolut',
    body: `Le compte a été relu jusqu’au ${dateShort(hint.through)} sans débit autour de la date prévue : le prélèvement a sans doute échoué.`,
  };
}

/** Paramètres de la feuille « Prélèvement non prévu », préremplie depuis le débit. */
export function unknownDebitParams(debit: HomeUnexpectedDebit): { name: string; amount: string; date: string; tx: string } {
  const cents = String(debit.amountCents % 100).padStart(2, '0');
  return { name: debit.name, amount: `${Math.floor(debit.amountCents / 100)},${cents}`, date: debit.date, tx: debit.transactionId };
}

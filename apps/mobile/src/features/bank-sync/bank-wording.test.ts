import { formatEuros } from '@abonnements/core';
import type { HomeUnexpectedDebit } from '@/db/repositories/home/types';
import { bankHintNotice, debitLabel, unexpectedDebitBody, unexpectedDebitTitle, unknownDebitParams } from './bank-wording';

const debit: HomeUnexpectedDebit = {
  transactionId: 'rev-1',
  label: 'CANAL PLUS',
  amountCents: 2405,
  date: '2026-11-18',
  subscriptionId: null,
  subscriptionName: null,
  name: 'CANAL PLUS',
  kind: 'unexpected_charge',
};

describe('débit non prévu', () => {
  it('titre le débit par son libellé et son montant', () => {
    expect(unexpectedDebitTitle(debit)).toBe(`CANAL PLUS · ${formatEuros(2405)}`);
    expect(debitLabel('  ')).toBe('Débit sans libellé');
  });

  it('explique le débit selon son classement', () => {
    expect(unexpectedDebitBody(debit)).toBe('Débité le 18\u00a0nov. sur Revolut. Sluis n’attendait pas ce prélèvement.');
    expect(unexpectedDebitBody({ ...debit, name: 'Canal+', kind: 'post_cancel_charge' })).toContain('Canal+ est pourtant résilié');
    expect(unexpectedDebitBody({ ...debit, name: 'Canal+', kind: 'duplicate' })).toContain('doublon');
    expect(unexpectedDebitBody({ ...debit, name: 'Canal+', kind: 'matches_charge' })).toContain('prélèvement Canal+ que Sluis attendait');
  });

  it('préremplit la saisie avec le nom reconnu, le montant à la virgule et la date', () => {
    expect(unknownDebitParams({ ...debit, name: 'Canal+' })).toEqual({ name: 'Canal+', amount: '24,05', date: '2026-11-18', tx: 'rev-1' });
  });
});

describe('bankHintNotice', () => {
  it('annonce le débit vu et le préremplissage', () => {
    const notice = bankHintNotice({ kind: 'debit', transactionId: 'rev-1', amountCents: 1349, date: '2026-11-21', label: 'Netflix' });
    expect(notice.title).toBe('Débit vu sur Revolut');
    expect(notice.body).toContain(`Netflix · ${formatEuros(1349)} le 21\u00a0nov.`);
  });

  it('annonce l’absence de débit jusqu’à la dernière lecture', () => {
    const notice = bankHintNotice({ kind: 'no_debit', through: '2026-11-25' });
    expect(notice.title).toBe('Aucun débit vu sur Revolut');
    expect(notice.body).toContain('jusqu’au 25\u00a0nov.');
  });
});

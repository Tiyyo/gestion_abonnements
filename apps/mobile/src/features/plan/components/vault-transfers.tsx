import { VaultCoverage } from '@/features/balances/components/vault-coverage';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { TransferRow } from './transfer-row';
import { remainingTransfersCents } from '@/features/plan/plan-labels';
import { Appear } from '@/ui/motion/appear';
import { SectionTitle } from '@/ui/text/section-title';
import { Body } from '@/ui/text/typography';

/** Section « Transferts coffre → compte » : couverture par le coffre puis la liste des transferts du mois. */
export function VaultTransfers({
  transfers,
  busy,
  onToggle,
  onMore,
}: {
  transfers: PlanTransfer[];
  busy: boolean;
  onToggle: (transfer: PlanTransfer) => void;
  onMore: (transfer: PlanTransfer) => void;
}) {
  return (
    <>
      <SectionTitle>Transferts coffre → compte</SectionTitle>
      <VaultCoverage remainingCents={remainingTransfersCents(transfers)} />
      {transfers.length === 0 ? (
        <Body color="colorMuted">Aucun transfert sur cette période.</Body>
      ) : (
        transfers.map((t, index) => (
          <Appear key={t.id} index={index}>
            <TransferRow transfer={t} busy={busy} onToggle={() => onToggle(t)} onMore={() => onMore(t)} />
          </Appear>
        ))
      )}
    </>
  );
}

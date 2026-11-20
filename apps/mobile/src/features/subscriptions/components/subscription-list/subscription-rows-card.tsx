import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { Card } from '@/ui/surfaces/card';
import { SubscriptionLine } from './subscription-line';

export function SubscriptionRowsCard({ rows, globalMarginBp }: { rows: readonly SubscriptionRow[]; globalMarginBp: number }) {
  return (
    <Card py="0" gap="0">
      {rows.map((row, i) => (
        <SubscriptionLine key={row.id} row={row} globalMarginBp={globalMarginBp} last={i === rows.length - 1} />
      ))}
    </Card>
  );
}

import type { BankHint } from '@/db/repositories/bank-transactions';
import { bankHintNotice } from '@/features/bank-sync/bank-wording';
import { Card } from '@/ui/surfaces/card';
import { Body, Overline } from '@/ui/text/typography';

/** Ce que la lecture du compte Revolut suggère pour ce prélèvement ; la réponse reste à l'utilisateur. */
export function BankHintNotice({ hint }: { hint: BankHint }) {
  const notice = bankHintNotice(hint);
  return (
    <Card tone="warn" accessible accessibilityLabel={`${notice.title}. ${notice.body}`}>
      <Overline color="warnText">{notice.title}</Overline>
      <Body>{notice.body}</Body>
    </Card>
  );
}

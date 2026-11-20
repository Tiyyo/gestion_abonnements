import { formatEuros } from '@abonnements/core';
import { CircleCheck, TriangleAlert } from 'lucide-react-native';
import { vaultShortfallCents } from '@/features/balances/balances-derivations';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { colors } from '@/theme/colors';
import { Notice } from './notice';

export function VaultCoverage({ remainingCents }: { remainingCents: number }) {
  const balances = useBalances();
  const data = balances.data;
  if (!data || remainingCents <= 0) {
    return null;
  }
  const shortfall = vaultShortfallCents(data.vault.amountCents, remainingCents);
  return shortfall > 0 ? (
    <Notice icon={TriangleAlert} color={colors.warn} tone="warnText">
      {`Coffre ${formatEuros(data.vault.amountCents)} : il manque ${formatEuros(shortfall)} pour les ${formatEuros(remainingCents)} restant à transférer.`}
    </Notice>
  ) : (
    <Notice icon={CircleCheck} color={colors.ok} tone="okText">
      {`Coffre ${formatEuros(data.vault.amountCents)} : couvre les ${formatEuros(remainingCents)} restant à transférer.`}
    </Notice>
  );
}

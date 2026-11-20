import { BellRing, Landmark, Sparkles } from 'lucide-react-native';
import { readBalancesConfig } from '@/config/function-config';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { aiSuggestionStatus, remindersStatus, revolutStatus } from '@/features/settings/service-status';
import { dateOfTimestamp } from '@/lib/dates';
import { Caption } from '@/ui/text/typography';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { ServiceLine } from './service-line';

type ServicesStatusCardProps = { remindersOn: boolean; notificationsAllowed: boolean | null; enrichIncluded: boolean; aiOn: boolean };

export function ServicesStatusCard({ remindersOn, notificationsAllowed, enrichIncluded, aiOn }: ServicesStatusCardProps) {
  const balances = useBalances();
  const consentUntil = balances.data ? dateOfTimestamp(balances.data.consentValidUntil) : undefined;
  return (
    <GlassCard gap="2" accessibilityLabel="État des services">
      <Caption color="onGlassMuted">État des services</Caption>
      {readBalancesConfig() ? <ServiceLine icon={Landmark} label="Revolut" {...revolutStatus(consentUntil)} /> : null}
      <ServiceLine icon={BellRing} label="Rappels" {...remindersStatus(remindersOn, notificationsAllowed)} />
      <ServiceLine icon={Sparkles} label="Suggestion IA" {...aiSuggestionStatus(enrichIncluded, aiOn)} />
    </GlassCard>
  );
}

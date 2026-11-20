import { router } from 'expo-router';
import { PiggyBank, Wallet } from 'lucide-react-native';
import { ScrollView, YStack } from 'tamagui';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { AccountPicker } from '@/features/consent/components/account-picker';
import { ConsentSteps } from '@/features/consent/components/consent-steps';
import { useConsentFlow } from '@/features/consent/hooks/use-consent-flow';
import { dateOfTimestamp, dateShortYear } from '@/lib/dates';
import { SheetHeader } from '@/ui/navigation/sheet-header';
import { FormGroup } from '@/ui/surfaces/form-group';
import { SheetFooter } from '@/ui/surfaces/sheet-footer';
import { SheetScreen } from '@/ui/surfaces/sheet-screen';
import { Caption } from '@/ui/text/typography';

/** Renouvellement de l'accord Enable Banking. Aussi la cible du lien profond `abonnements://consent` au retour de la banque. */
export default function ConsentScreen() {
  const flow = useConsentFlow();
  const until = useBalances().data?.consentValidUntil;
  const mapping = flow.phase === 'mapping' || (flow.phase === 'saving' && flow.session);
  const accounts = flow.session?.accounts ?? [];

  return (
    <SheetScreen>
      <SheetHeader title="Accord bancaire" onCancel={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <YStack px="4" pt="5" gap="5">
          {mapping ? (
            <YStack gap="2">
              <FormGroup title="Comptes à lire">
                <AccountPicker
                  icon={Wallet}
                  label="Compte courant"
                  accounts={accounts}
                  value={flow.mapping.currentUid}
                  onChange={flow.setCurrent}
                />
                <AccountPicker
                  icon={PiggyBank}
                  label="Coffre"
                  accounts={accounts}
                  value={flow.mapping.vaultUid}
                  onChange={flow.setVault}
                  last
                />
              </FormGroup>
              <Caption px="1">Revolut a partagé plusieurs comptes : indique lequel est le compte courant et lequel est le coffre.</Caption>
            </YStack>
          ) : (
            <ConsentSteps phase={flow.phase} currentUntil={until ? dateShortYear(dateOfTimestamp(until)) : null} />
          )}
        </YStack>
      </ScrollView>
      {mapping ? (
        <SheetFooter
          label="Enregistrer les comptes"
          busy={flow.phase === 'saving'}
          disabled={!flow.mapping.currentUid || !flow.mapping.vaultUid}
          onPress={() => flow.confirm()}
        />
      ) : (
        <SheetFooter
          label={flow.phase === 'waiting' ? 'Rouvrir Revolut' : 'Ouvrir Revolut'}
          busy={false}
          disabled={flow.phase === 'opening' || flow.phase === 'finishing'}
          onPress={() => flow.start()}
        />
      )}
    </SheetScreen>
  );
}

import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readBalancesConfig } from '@/config/function-config';
import { balancesKey } from '@/features/balances/query-keys';
import { type AccountMapping, suggestMapping } from '@/features/consent/account-mapping';
import { beginConsent, completeConsent, storeBankLink } from '@/features/consent/consent-actions';
import { consentErrorKind } from '@/features/consent/consent-error';
import { consentReturnUrl, peekConsentReturn, subscribeConsentInbox, takeConsentReturn } from '@/features/consent/consent-inbox';
import type { ConsentSession } from '@/features/consent/consent-schema';
import { consentErrorMessage } from '@/features/consent/consent-wording';
import { loadBankLink } from '@/features/consent/link-store';
import { dateOfTimestamp, dateShortYear } from '@/lib/dates';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { haptic } from '@/ui/motion/haptics';

export type ConsentPhase = 'intro' | 'opening' | 'waiting' | 'finishing' | 'mapping' | 'saving';

const NO_MAPPING: AccountMapping = { currentUid: null, vaultUid: null, certain: false };

function announceFailure(error: unknown): void {
  haptic.error();
  const { title, message } = consentErrorMessage(consentErrorKind(error), consentReturnUrl());
  showError(title, message);
}

/** Garde le lien bancaire, relit les soldes et referme l'écran. */
async function saveAndClose(queryClient: QueryClient, session: ConsentSession, chosen: AccountMapping): Promise<void> {
  const link = await storeBankLink(session, chosen.currentUid, chosen.vaultUid);
  await queryClient.invalidateQueries({ queryKey: balancesKey });
  haptic.success();
  const until = dateShortYear(dateOfTimestamp(link.validUntil));
  showDialog('Accord renouvelé', `Sluis lit à nouveau les soldes Revolut jusqu’au ${until}.`, undefined, { tone: 'ok' });
  router.back();
}

/**
 * Déroulé du renouvellement : ouverture de Revolut, retour par lien profond, échange du code, choix des deux comptes,
 * puis enregistrement dans le coffre de clés et relecture des soldes.
 */
export function useConsentFlow() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<ConsentPhase>('intro');
  const [session, setSession] = useState<ConsentSession | null>(null);
  const [mapping, setMapping] = useState<AccountMapping>(NO_MAPPING);
  const handling = useRef(false);

  const save = useCallback(
    async (next: ConsentSession, chosen: AccountMapping) => {
      setPhase('saving');
      await saveAndClose(queryClient, next, chosen).catch((error: unknown) => {
        announceFailure(error);
        setPhase('mapping');
      });
    },
    [queryClient],
  );

  const handleReturn = useCallback(async () => {
    const config = readBalancesConfig();
    const ret = !handling.current && config ? takeConsentReturn() : null;
    if (!ret || !config) {
      return;
    }
    handling.current = true;
    setPhase('finishing');
    try {
      const next = await completeConsent(config, ret);
      const suggested = suggestMapping(next.accounts, await loadBankLink());
      setSession(next);
      setMapping(suggested);
      await (suggested.certain ? save(next, suggested) : Promise.resolve(setPhase('mapping')));
    } catch (error) {
      announceFailure(error);
      setPhase('intro');
    } finally {
      handling.current = false;
    }
  }, [save]);

  // Le retour arrive par la boîte de réception des liens profonds, déjà là à l'ouverture ou plus tard.
  useEffect(() => {
    const unsubscribe = subscribeConsentInbox(() => {
      if (peekConsentReturn()) {
        handleReturn();
      }
    });
    Promise.resolve().then(handleReturn);
    return unsubscribe;
  }, [handleReturn]);

  const start = useCallback(async () => {
    const config = readBalancesConfig();
    if (!config) {
      return;
    }
    setPhase('opening');
    await beginConsent(config).then(
      () => setPhase('waiting'),
      (error: unknown) => {
        announceFailure(error);
        setPhase('intro');
      },
    );
  }, []);

  return {
    phase,
    session,
    mapping,
    start,
    setCurrent: (uid: string) => setMapping((m) => ({ ...m, currentUid: uid, vaultUid: m.vaultUid === uid ? null : m.vaultUid })),
    setVault: (uid: string) => setMapping((m) => ({ ...m, vaultUid: uid, currentUid: m.currentUid === uid ? null : m.currentUid })),
    confirm: () => session && save(session, mapping),
  };
}

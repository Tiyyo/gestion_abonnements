import { router } from 'expo-router';
import type { HomeUpcoming } from '@/db/repositories/home/types';
import { ActionButton } from '@/ui/controls/action-button';
import { Appear } from '@/ui/motion/appear';
import { SectionTitle } from '@/ui/text/section-title';
import { Body } from '@/ui/text/typography';
import { UpcomingChargeRow } from './upcoming-charge-row';

export function UpcomingChargesList({ upcoming }: { upcoming: HomeUpcoming[] }) {
  return (
    <>
      <SectionTitle action={<ActionButton label="Tout voir" variant="ghost" size="sm" onPress={() => router.navigate('/plan')} />}>
        Prochains prélèvements
      </SectionTitle>
      {upcoming.length === 0 ? (
        <Body color="colorMuted">Aucun prélèvement financé à venir.</Body>
      ) : (
        upcoming.map((u, index) => (
          <Appear key={u.chargeId} index={index + 2}>
            <UpcomingChargeRow upcoming={u} />
          </Appear>
        ))
      )}
    </>
  );
}

import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { accountHint, accountLabel, accountName } from '@/features/consent/account-mapping';
import type { ConsentAccount } from '@/features/consent/consent-schema';
import { PickerRow } from '@/ui/controls/picker-row';
import { BottomSheet } from '@/ui/feedback/bottom-sheet';
import { SheetOption } from '@/ui/feedback/sheet-option';

/** Ligne « Compte courant → nom › » qui ouvre la liste des comptes partagés par Revolut. */
export function AccountPicker({
  icon,
  label,
  accounts,
  value,
  onChange,
  last,
}: {
  icon: LucideIcon;
  label: string;
  accounts: ConsentAccount[];
  value: string | null;
  onChange: (uid: string) => void;
  last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerRow icon={icon} label={label} value={accountName(accounts, value)} onPress={() => setOpen(true)} last={last} />
      <BottomSheet open={open} title={label} onClose={() => setOpen(false)}>
        {accounts.map((account, index) => (
          <SheetOption
            key={account.uid}
            label={accountLabel(account)}
            hint={accountHint(account) || undefined}
            selected={account.uid === value}
            last={index === accounts.length - 1}
            onPress={() => {
              onChange(account.uid);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}

import type { ReactNode } from 'react';
import { type DimensionValue, View } from 'react-native';
import { Skeleton, type SkeletonTone } from './skeleton';

interface Props {
  /** Largeur du bloc fantôme. */
  w: DimensionValue;
  tone?: SkeletonTone;
  radius?: number;
  /** `false` : garde la place de la ligne sans afficher le bloc (délai anti-clignotement). */
  visible?: boolean;
  /** Texte témoin (même composant typographique que le contenu final), rendu invisible : il fixe la hauteur de la ligne. */
  children: ReactNode;
}

/** Ligne de texte fantôme : occupe exactement la hauteur du texte final, sans dépendre des métriques de la police. */
export function SkeletonLine({ w, tone, radius, visible = true, children }: Props) {
  return (
    <View style={{ width: w, maxWidth: '100%' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ opacity: 0 }}>{children}</View>
      {visible ? (
        <Skeleton tone={tone} radius={radius} style={{ position: 'absolute', left: 0, right: 0, top: '18%', bottom: '18%' }} />
      ) : null}
    </View>
  );
}

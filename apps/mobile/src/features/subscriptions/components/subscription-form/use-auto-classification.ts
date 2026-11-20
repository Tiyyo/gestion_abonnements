import { normalizeName } from '@abonnements/core';
import { useEffect, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { AUTO_APPLY_CONFIDENCE, matchBrand } from '@/features/enrich/brands';
import { useLocalSuggestion } from '@/features/enrich/hooks/use-local-suggestion';
import { isAutoApplicable } from '@/features/enrich/suggestion';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';

interface Options {
  /** Création seulement : une modification ne reclasse jamais un abonnement existant. */
  enabled: boolean;
  /** Nom stabilisé (500 ms sans frappe ou champ quitté). */
  name: string;
  fallback: { categoryId: string; iconKey: string | null };
  setValue: UseFormSetValue<SubscriptionFormValues>;
}

/**
 * Catégorie et logo appliqués d'office quand le nom désigne une correction apprise ou une marque sûre.
 * Dès que l'utilisateur choisit lui-même (`touch`) ou applique une suggestion (`accept`), plus rien ne bouge.
 * Sans correspondance, on revient aux valeurs de départ : « Netflix » corrigé en « Loyer » ne reste pas en Vidéo.
 */
export function useAutoClassification({ enabled, name, fallback, setValue }: Options) {
  const [touched, setTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const locked = touched || accepted;
  const local = useLocalSuggestion(enabled ? name : '');
  const settled = normalizeName(name).length < 2 || local.isSuccess;
  const target = isAutoApplicable(local.data) ? local.data : null;
  const categoryId = target ? target.categoryId : fallback.categoryId;
  const iconKey = target ? target.iconKey : fallback.iconKey;

  useEffect(() => {
    if (enabled && !locked && settled) {
      setValue('categoryId', categoryId);
      setValue('iconKey', iconKey);
    }
  }, [enabled, locked, settled, categoryId, iconKey, setValue]);

  /** À l'enregistrement : si la recherche n'a pas eu le temps d'aboutir pour ce nom, la marque sûre est appliquée sur-le-champ. */
  const classify = (values: SubscriptionFormValues): SubscriptionFormValues => {
    const upToDate = settled && normalizeName(values.name) === normalizeName(name);
    if (!enabled || locked || upToDate) {
      return values;
    }
    const brand = matchBrand(values.name);
    return brand && brand.confidence >= AUTO_APPLY_CONFIDENCE
      ? { ...values, categoryId: brand.categoryId, iconKey: brand.iconKey }
      : values;
  };

  return {
    locked,
    /** Catégorie ou logo choisi à la main : à mémoriser comme correction. */
    touched,
    touch: () => setTouched(true),
    accept: () => {
      setAccepted(true);
      setTouched(false);
    },
    classify,
  };
}

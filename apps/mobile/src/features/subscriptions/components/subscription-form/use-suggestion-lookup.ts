import { useEffect, useState } from 'react';
import { readEnrichConfig } from '@/features/enrich/enrich-client';
import { useSuggestion } from '@/features/enrich/hooks/use-suggestion';
import { useSettings } from '@/features/settings/hooks/use-settings';

/**
 * Suggestion de catégorie et de logo pour le nom saisi (création seulement), après 500 ms sans frappe
 * ou dès que le champ perd le focus. Une suggestion appliquée ou ignorée ne revient pas pour le même nom.
 */
export function useSuggestionLookup(mode: 'create' | 'edit', name: string, initialName: string) {
  const settings = useSettings();
  const [lookupName, setLookupName] = useState(mode === 'create' ? '' : initialName);
  const [handled, setHandled] = useState<string | null>(mode === 'edit' ? initialName : null);

  useEffect(() => {
    const timer = setTimeout(() => setLookupName(name), 500);
    return () => clearTimeout(timer);
  }, [name]);

  const aiEnabled = settings.data?.ai_suggestion_enabled !== 0 && readEnrichConfig() !== null;
  const suggestion = useSuggestion(mode === 'create' ? lookupName : '', aiEnabled);
  const visible = mode === 'create' && Boolean(suggestion.data) && handled !== lookupName;

  return {
    lookupName,
    lookupNow: setLookupName,
    aiEnabled,
    suggestion: suggestion.data ?? null,
    visible,
    markHandled: () => setHandled(lookupName),
  };
}

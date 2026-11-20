/** Catégorie des rappels de transfert : elle porte le bouton « Marquer fait ». */
export const FUNDING_CATEGORY = 'funding';
export const MARK_DONE_ACTION = 'mark-done';

/** Ce que l'app lit d'une réponse à une notification (toucher la notification ou l'un de ses boutons). */
export interface ResponseInfo {
  requestId: string;
  actionId: string;
  data: unknown;
}

export interface ResponseIntent {
  /** Clé de dédoublonnage : une même réponse n'est appliquée qu'une fois. */
  key: string;
  /** Écran à ouvrir ; `null` pour une notification sans adresse. */
  url: string | null;
  /** Transfert à marquer fait (bouton « Marquer fait ») ; `null` pour un simple toucher. */
  markDoneTransferId: string | null;
}

/** Identifie une réponse : la notification (identifiant unique de l'OS) et le bouton touché. */
export function responseKey(requestId: string, actionId: string): string {
  return `${requestId}|${actionId}`;
}

function field(data: unknown, name: string): string | null {
  const value = typeof data === 'object' && data !== null ? (data as Record<string, unknown>)[name] : undefined;
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Traduit une réponse en intention. Les notifications planifiées avant l'ajout du bouton n'ont que `data.url` :
 * elles ouvrent l'écran indiqué, comme avant.
 */
export function interpretResponse(response: ResponseInfo): ResponseIntent {
  return {
    key: responseKey(response.requestId, response.actionId),
    url: field(response.data, 'url'),
    markDoneTransferId: response.actionId === MARK_DONE_ACTION ? field(response.data, 'transferId') : null,
  };
}

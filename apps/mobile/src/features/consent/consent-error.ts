export type ConsentErrorKind =
  | 'cancelled'
  | 'state_mismatch'
  | 'expired'
  | 'network'
  | 'not_configured'
  | 'redirect_not_allowed'
  | 'return_not_allowed'
  | 'no_accounts'
  | 'browser'
  | 'storage'
  | 'bank';

/** Échec du renouvellement de l'accord bancaire ; `kind` choisit le message affiché (`consent-wording`). */
export class ConsentError extends Error {
  readonly kind: ConsentErrorKind;

  constructor(kind: ConsentErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export function consentErrorKind(error: unknown): ConsentErrorKind {
  return error instanceof ConsentError ? error.kind : 'bank';
}

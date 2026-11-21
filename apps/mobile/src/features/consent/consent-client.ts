import { ConsentError, type ConsentErrorKind } from './consent-error';
import {
  type ConsentSession,
  type ConsentStart,
  consentErrorResponseSchema,
  consentFinishResponseSchema,
  consentStartResponseSchema,
} from './consent-schema';

const TIMEOUT_MS = 15000;

type Config = { url: string; secret: string };

const SERVER_CODES: Record<string, ConsentErrorKind> = {
  code_expired: 'expired',
  redirect_not_allowed: 'redirect_not_allowed',
  return_not_allowed: 'return_not_allowed',
  not_configured: 'not_configured',
};

/** Adresse d'une étape du renouvellement, à côté de la route des soldes (`…/balances/consent/start`). */
export function consentUrl(balancesUrl: string, step: 'start' | 'finish'): string {
  return `${balancesUrl.replace(/\/+$/, '')}/consent/${step}`;
}

async function failure(response: Response): Promise<ConsentError> {
  // 401 : le secret embarqué n'est pas celui de la fonction, c'est un défaut de configuration.
  if (response.status === 401 || response.status === 404) {
    return new ConsentError('not_configured');
  }
  const body = consentErrorResponseSchema.safeParse(await response.json().catch(() => null));
  return new ConsentError((body.success && body.data.code && SERVER_CODES[body.data.code]) || 'bank');
}

async function post(url: string, secret: string, body: unknown, fetchImpl: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ConsentError('network');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw await failure(response);
  }
  return response.json().catch(() => null);
}

/** Demande à la fonction l'adresse d'autorisation de la banque. `returnUrl` : lien profond de retour dans l'app. */
export async function startConsent(config: Config, returnUrl: string, fetchImpl: typeof fetch = fetch): Promise<ConsentStart> {
  const parsed = consentStartResponseSchema.safeParse(await post(consentUrl(config.url, 'start'), config.secret, { returnUrl }, fetchImpl));
  if (!parsed.success) {
    throw new ConsentError('bank');
  }
  return parsed.data;
}

/** Échange le code reçu au retour de la banque contre la session et ses comptes. */
export async function finishConsent(config: Config, code: string, fetchImpl: typeof fetch = fetch): Promise<ConsentSession> {
  const parsed = consentFinishResponseSchema.safeParse(await post(consentUrl(config.url, 'finish'), config.secret, { code }, fetchImpl));
  if (!parsed.success) {
    throw new ConsentError('bank');
  }
  return parsed.data;
}

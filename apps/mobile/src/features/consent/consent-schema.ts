import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

/** Contrat `contracts/consent.schema.json` : réponses de `…/consent/start` et `…/consent/finish`. */
export const consentStartResponseSchema = z
  .object({
    url: z.string().regex(/^https:\/\/\S+$/),
    state: z.string().regex(/^[0-9]{1,2}\.[A-Za-z0-9_-]{32}$/),
  })
  .strict();

export const consentAccountSchema = z
  .object({
    uid: id,
    name: z.string().max(80),
    ibanTail: z.string().max(4),
    currency: z.string().max(3),
    product: z.string().max(80),
    cashAccountType: z.string().max(4),
    identificationHash: z.string().max(128),
  })
  .strict();

export const consentFinishResponseSchema = z
  .object({
    sessionId: id,
    validUntil: z.string().datetime({ offset: true }),
    accounts: z.array(consentAccountSchema),
  })
  .strict();

export const consentErrorResponseSchema = z.object({ error: z.string(), code: z.string().optional() });

export type ConsentStart = z.infer<typeof consentStartResponseSchema>;
export type ConsentAccount = z.infer<typeof consentAccountSchema>;
export type ConsentSession = z.infer<typeof consentFinishResponseSchema>;

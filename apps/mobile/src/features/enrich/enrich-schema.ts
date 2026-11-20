import { z } from 'zod';

export const CATEGORY_NAMES = [
  'Musique',
  'Vidéo',
  'Stockage cloud',
  'Jeux',
  'Productivité',
  'Presse',
  'Santé/Sport',
  'IA',
  'Autre',
] as const;

export const enrichResponseSchema = z
  .object({
    category: z.enum(CATEGORY_NAMES),
    iconKey: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .nullable(),
    cancelUrl: z.string().url().startsWith('https://').nullable(),
    trialDays: z.number().int().min(0).max(365).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type EnrichResponse = z.infer<typeof enrichResponseSchema>;

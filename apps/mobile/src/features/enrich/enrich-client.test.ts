import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { callEnrich } from './enrich-client';
import { enrichResponseSchema } from './enrich-schema';
import { fromEnrich } from './suggestion';

const valid = {
  category: 'Vidéo' as const,
  iconKey: 'netflix',
  cancelUrl: 'https://www.netflix.com/cancelplan',
  trialDays: null,
  confidence: 0.92,
};
const config = { url: 'https://enrich.example/enrich', secret: 's3cret' };
const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('contrat /enrich', () => {
  it.each(['enrich.response.full.json', 'enrich.response.empty.json'])('accepte la sortie du serveur Go (%s)', (file) => {
    const body = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'contracts', 'fixtures', file), 'utf8'));
    expect(enrichResponseSchema.safeParse(body).success).toBe(true);
  });

  it('accepte une réponse conforme', () => {
    expect(enrichResponseSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['catégorie inconnue', { ...valid, category: 'Cuisine' }],
    ['lien non https', { ...valid, cancelUrl: 'http://netflix.com' }],
    ['durée d’essai hors bornes', { ...valid, trialDays: 400 }],
    ['champ en trop', { ...valid, price: 9.99 }],
    ['champ manquant', { category: 'Vidéo', iconKey: null, cancelUrl: null, trialDays: null }],
  ])('refuse : %s', (_label, body) => {
    expect(enrichResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('callEnrich', () => {
  it('envoie seulement le nom, avec le secret', async () => {
    const fetchImpl = reply(valid);
    await callEnrich('Netflix', config, fetchImpl);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe(config.url);
    expect(JSON.parse(init.body)).toEqual({ name: 'Netflix' });
    expect(init.headers.Authorization).toBe('Bearer s3cret');
  });

  it('renvoie null si le serveur échoue ou répond hors contrat', async () => {
    expect(await callEnrich('Netflix', config, reply({ error: 'x' }, 500))).toBeNull();
    expect(await callEnrich('Netflix', config, reply({ ...valid, category: 'Cuisine' }))).toBeNull();
  });

  it('ignore un logo absent de la liste embarquée', () => {
    expect(fromEnrich({ ...valid, iconKey: 'disneyplus' })).toMatchObject({ categoryId: 'cat-video', iconKey: null });
  });
});

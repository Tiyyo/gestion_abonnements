import { formatEuros } from '@abonnements/core';
import { reviewAmountHint, reviewIntro, reviewOutcomes } from './review-labels';

const funded = { status: 'funded', expected_amount_cents: 999, funded_amount_cents: 1029 };
const unfunded = { status: 'unfunded', expected_amount_cents: 999, funded_amount_cents: 0 };

describe('reviewIntro', () => {
  it('rappelle le montant attendu et le montant financé', () => {
    const intro = reviewIntro(funded);
    expect(intro).toContain(`Attendu ${formatEuros(999)}`);
    expect(intro).toContain(`financé ${formatEuros(1029)}`);
  });

  it('prévient qu’un prélèvement non financé a dû échouer', () => {
    expect(reviewIntro(unfunded)).toContain('n’était pas financé');
  });
});

describe('reviewAmountHint', () => {
  it('ne parle de nouveau prix que pour un prélèvement financé', () => {
    expect(reviewAmountHint(funded)).toContain('nouveau prix');
    expect(reviewAmountHint(unfunded)).not.toContain('nouveau prix');
  });
});

describe('reviewOutcomes', () => {
  it('décrit les deux réponses, « passé » d’abord', () => {
    expect(reviewOutcomes(funded).map((o) => o.answer)).toEqual(['paid', 'failed']);
  });

  it('un échec financé annonce la question sur la nouvelle tentative, pas un échec non financé', () => {
    expect(reviewOutcomes(funded)[1]?.detail).toContain('retenter');
    expect(reviewOutcomes(unfunded)[1]?.detail).not.toContain('retenter');
  });
});

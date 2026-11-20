export const subscriptionsKey = ['subscriptions'] as const;

/** Tout ce qu'un changement d'abonnement peut modifier : listes, plan, accueil, prélèvements, statistiques. */
export const subscriptionRelatedKeys = [subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']] as const;

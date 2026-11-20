/** Correction de catégorie et d'icône à mémoriser pour les prochaines suggestions IA. */
export interface EditOptions {
  correction?: { categoryId: string; iconKey: string } | null;
}

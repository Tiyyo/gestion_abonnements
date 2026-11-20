// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-plugin-prettier/recommended');
const checkFile = require('eslint-plugin-check-file');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['android/**', 'dist/**', 'node_modules/**', 'src/features/subscriptions/brand-icons.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'check-file': checkFile },
    rules: {
      // Noms de fichiers et dossiers en kebab-case ; les routes Expo Router gardent leurs crochets et parenthèses.
      'check-file/filename-naming-convention': [
        'error',
        {
          'src/!(app)/**/!(0*).{ts,tsx}': 'KEBAB_CASE',
          'src/db/migrations/0*.{ts,tsx}': '+([0-9])-+([a-z0-9-])',
          'src/app/**/*.{ts,tsx}': '@(_layout|\\[+([a-z0-9-])\\]|+([a-z0-9-]))',
        },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { 'src/!(app)/**/': 'KEBAB_CASE' }],
      // Un fichier, une responsabilité : un fichier trop long en porte presque toujours plusieurs.
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../*'], message: 'Importer via l’alias @/ plutôt qu’un chemin relatif remontant.' }] },
      ],
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['src/**/*.test.ts'],
    // Un fichier de tests regroupe les scénarios d’un module : sa longueur suit celle du comportement couvert.
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
]);

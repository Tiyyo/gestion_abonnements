const { withAndroidManifest } = require('expo/config-plugins');

const REVOLUT_PACKAGE = 'com.revolut.revolut';

/**
 * Android 11+ (visibilité des paquets) : sans cette entrée `<queries>`, l'app ne « voit » pas Revolut et ne peut pas
 * la lancer par son nom de paquet (raccourci « Copier le montant et ouvrir Revolut »). Ne prend effet que dans un APK reconstruit.
 */
module.exports = function withRevolutQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const queries = manifest.queries ?? [];
    const declared = queries.some((q) => (q.package ?? []).some((p) => p.$?.['android:name'] === REVOLUT_PACKAGE));
    if (!declared) {
      queries.push({ package: [{ $: { 'android:name': REVOLUT_PACKAGE } }] });
    }
    manifest.queries = queries;
    return cfg;
  });
};

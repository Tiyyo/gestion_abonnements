# Widget Android « Prochain transfert »

Widget d'écran d'accueil qui affiche le prochain transfert coffre → compte (date, montant, abonnements financés), « Rien à transférer » s'il n'y en a pas, et un état « en retard ». Un appui ouvre l'app sur l'Accueil.

## Décision (20/11/2026) : module Expo local, pas `react-native-android-widget`

Deux options ont été évaluées.

**A. `react-native-android-widget` 0.26.0** (dernière version, octobre 2026). Ses `devDependencies` sont alignées sur RN 0.88.1 et React 19.3, `peerDependencies` `expo >= 54` : la compatibilité est plausible. Mais :

- le widget est dessiné par une **tâche JS headless** : à chaque mise à jour (minuit, mise à jour périodique), Android démarre le runtime Hermes et tout le bundle de l'app en arrière-plan, alors que l'entrée est `expo-router/entry` (il faut un point d'entrée dédié pour enregistrer le gestionnaire) ;
- ce gestionnaire devrait ouvrir la base `expo-sqlite` hors de l'app, alors que `db/provider.tsx` suppose une seule connexion (deux connexions simultanées bloquent le thread JS en dev) ;
- la partie Java s'appuie sur des API internes de React Native (`HeadlessJsTaskContext`, `ReactHost`, `uimanager.style.*`, une copie de `CSSBackgroundDrawable`) qui changent souvent d'une version à l'autre : impossible de garantir sans appareil que ce chemin fonctionne en New Architecture sans pont.

**B. Module Expo local** (`apps/mobile/modules/sluis-widget`, autolinké depuis `modules/`). Retenu : moins de pièces mobiles, aucune dépendance, et tout ce qui peut être vérifié sans téléphone l'est.

- L'app calcule un **instantané** JSON (`src/features/widget/snapshot.ts`, fonction pure testée) et l'écrit via `SluisWidget.setSnapshot(json)` dans des `SharedPreferences` privées.
- Le widget natif (`NextTransferWidget`, `AppWidgetProvider` en Kotlin, `RemoteViews`) ne fait que lire cet instantané : ni base, ni JavaScript.
- L'instantané contient plusieurs **images datées** (aujourd'hui, la veille de chaque transfert « Demain », le jour même « Aujourd'hui », le lendemain « En retard ») : le widget reste juste plusieurs jours sans que l'app soit ouverte. Le natif prend la dernière image dont la date de départ est atteinte (même règle que `frameFor` côté JS).
- Le récepteur, ses ressources et la description du widget vivent dans le module (fusion de manifeste) : `android/` reste généré, rien à ajouter dans `app.json`.

## Comportement

- Tailles : 2×1 (`targetCellWidth` 2, `minWidth` 110 dp), redimensionnable horizontalement jusqu'à 4×1 et plus. À partir de 200 dp de large, la mise en page large ajoute « Pour Netflix, Spotify… » à droite.
- Couleurs : fond aubergine `#4C1E4F`, montant en blanc, date en pêche `#F6D5C4` ; retard en pastille pêche, texte aubergine. Rayon : `system_app_widget_background_radius` sous Android 12+, 16 dp avant.
- États : prochain transfert (date relative, montant, abonnements), en retard (somme des transferts en retard, « 2 en retard » s'il y en a plusieurs ; le retard passe avant le prochain, comme sur l'Accueil), rien à transférer, et « Ouvre Sluis » tant que l'app n'a jamais écrit d'instantané.
- Données affichées : dates, montants et noms d'abonnements uniquement.
- Mises à jour : l'app écrit l'instantané au lancement, au retour au premier plan, au passage en arrière-plan, après toute mutation TanStack Query (transfert fait, report, création…), après la maintenance quotidienne, un import et un prélèvement inconnu. Le widget se redessine aussi à minuit (alarme inexacte non réveillante), au changement d'heure ou de fuseau, et toutes les 3 h (`updatePeriodMillis`).
- Appui : lien profond `abonnements:///` vers `MainActivity` (`singleTask`), qu'Expo Router ouvre sur l'Accueil.
- Sélecteur de widgets : description, `previewLayout` (Android 12+) et image `drawable-nodpi/sluis_widget_preview.png` (Android 11 et moins, régénérée par `node scripts/gen-widget-preview.mjs`).

## Limites connues

- Une image future suppose que rien n'est marqué fait d'ici là ; dès que l'app s'ouvre, l'instantané est recalculé.
- Expo Go n'a pas le module : `src/features/widget/native.ts` retombe sur un pont vide.
- Lanceur MIUI : la taille réelle des cellules varie ; la mise en page 2×1 ne montre que la date et le montant.

# Sluis (app de gestion d'abonnements)

**Sluis** (« écluse » en néerlandais) : application mobile personnelle (un seul utilisateur, Android) qui suit les abonnements, calcule le plan d'alimentation Revolut et protège contre les essais gratuits oubliés. Langue du produit et des commentaires métier : français.

## Principe métier (à ne jamais casser)
- Le compte Revolut reste à 0 € ; l'argent dort dans un coffre.
- Chaque prélèvement **voulu** est financé juste avant sa date (J-1, ou dernier jour ouvré précédent) : coffre → compte principal, montant + marge.
- Un prélèvement **non voulu** (essai oublié, abonnement à résilier) n'est jamais financé (`charge.status = 'unfunded'`) : il échoue faute de solde.
- Marge en pourcentage, plafonnée à 5 %.

## Documents de conception
- `docs/conception/stack.md` : stack, structure du dépôt, spike, ordre de réalisation. **Fait foi** pour la technique.
- `docs/conception/modele-de-donnees.md` : entités, états, algorithmes, cas limites.
- `docs/conception/schema-reference.sql` : schéma SQL de référence.
- `apps/mobile/db/` : migration Kysely `001_init`, types `DB`, client, tests. **Fait foi** pour la base.
- Maquettes des 7 écrans : https://claude.ai/artifact/AUntGw7RMDFjJAGtnMznwg

## Où la conception a évolué (le code et la fiche de stack priment)
- Marges stockées en **points de base** (`*_margin_bp`, 300 = 3 %, plafond 500), pas en pourcentage décimal.
- **Pas de trigger de cascade** à la résiliation : cette logique est dans `packages/core` (elle replanifie aussi les notifications). Seuls les triggers `updated_at` restent en base.
- Pas de table `schema_migrations` : Kysely gère la sienne.
- La vue `v_upcoming_charge` n'a pas de filtre sur la date du jour : le repository passe la date (fuseau Europe/Paris).
- Backend IA en **Go** (Scaleway Serverless Functions), pas en TypeScript ; contrat de référence en JSON Schema.
- **Décisions v1** (`modele-de-donnees.md` section 9) : euro uniquement, solde estimé unique, alerte d'essai sans modifier le plan, virement de paie reporté au jour ouvré suivant, rattachement par date de transfert, provision avec marge et complément, question à J+1 sans décision sur un essai, régénération sur place. Elles priment sur les sections 3 et 5.
- **Compléments v1** (section 10) : report de transfert via `transfer.rescheduled_date` (migration `002` à écrire), question J+1 en fin de période à résilier, rapprochement complet, logos Simple Icons avec repli initiales, contrat `contracts/enrich.schema.json`, import en remplacement seul, écrans complémentaires. Ils priment sur les sections 2, 3.8, 4, 6 et 7.

## Stack
Expo SDK 58 (React Native 0.88, React 19.3, New Architecture), Expo Router (routes dans `apps/mobile/app/`), Tamagui 3.3, Reanimated 4.7 + `react-native-worklets`, `expo-sqlite` + Kysely 0.29, TanStack Query 5, React Hook Form + Zod, notifications locales `expo-notifications`. Tests : Vitest 5 + `better-sqlite3`. Monorepo pnpm (`node-linker=hoisted`).

## Commandes
- Dans `apps/mobile` : `npx vitest run` (tests base), `npx tsc --noEmit` (types), `npx expo-doctor`, `npx expo export --platform android` (vérifie le bundle Hermes).
- Dans `apps/enrich` : `go test ./...`, `go vet ./...` ; `go test ./... -update` régénère `contracts/fixtures` (relues par `features/enrich.test.ts`).
- Icône et écran de démarrage : `node scripts/gen-app-icons.mjs` dans `apps/mobile` régénère `assets/*.png` depuis `ui/brand/sluis-mark.json` (portes d'écluse, passerelle, vagues). La même géométrie anime `ui/brand/SplashOverlay.tsx` (écran de chargement JS qui prend le relais de l'écran natif). Le paquet Android reste `fr.smatou.abonnements` (le changer = nouvelle app, données perdues).
- Logos : `node scripts/gen-brand-icons.mjs` dans `apps/mobile` (régénère `ui/brand-icons.ts` et `apps/enrich/brands.go`, ajouter une marque dans la liste du script).
- Ajouter une dépendance native : `npx expo install <paquet>`, jamais `pnpm add` (versions alignées sur le SDK).
- `android/` est généré (`expo prebuild`) et ignoré par git : configurer via `app.json` et les plugins.

## Pièges connus (spike du 19/11/2026)
- **Dialecte Kysely maison** : `db/expo-sqlite-database.ts` adapte l'API synchrone d'`expo-sqlite` au `SqliteDialect` intégré à Kysely. Aucun dialecte communautaire n'était à jour pour le SDK 58.
- **`kysely/migration` et Hermes** : l'entrée embarque `FileMigrationProvider` (`import()` dynamique, refusé par Hermes). `metro.config.js` redirige `kysely/migration` vers `migrator.js`. Ne pas retirer cette redirection.
- **Tamagui 3** : valeurs de thème et de tokens **sans `$`** (`bg="primary"`, `gap="4"`) ; config v6 = **raccourcis obligatoires** (`p`, `px`, `pt`, `items`, `justify`, `rounded`, `minH`…) ; `animation` → `transition`, `enterStyle` / `pressStyle` → modificateurs dans la valeur (`opacity="1 enter:0"`, `bg="primary press:…"`). Rayons : `rounded="xl"`. Icônes : `lucide-react-native`.
- **Jamais de `lineHeight` numérique ni d'`adjustsFontSizeToFit`** sur un texte Tamagui : sous Android, le texte s'étire sur toute la hauteur et écrase le reste de l'écran (constaté le 19/11/2026).
- **`Modal` + `statusBarTranslucent`** : sous Android, la fenêtre de la modale s'agrandit de la hauteur de la barre d'état juste après l'ouverture, et tout contenu collé en bas saute de ~29 dp. Ne pas l'utiliser pour la feuille du bas (`ui/dialog.tsx`) ; garder `navigationBarTranslucent` avec un `SafeAreaProvider` dans la modale, et figer la marge du bas sur la plus grande valeur reçue (elle passe brièvement à 0).
- Pas de plugin Babel Tamagui (compilateur désactivé, cf. stack.md 4.1).

## Conventions
- Montants en **centimes** (entiers), jamais de flottants. Arrondi au centime supérieur : `(montant × (10000 + marge_bp) + 9999) / 10000`.
- Dates en `YYYY-MM-DD`, fuseau Europe/Paris ; horodatages en ISO 8601 UTC.
- Identifiants UUID v4 générés côté app. Suppression logique via `archived_at`.
- `packages/core` est du TypeScript **pur** : aucune dépendance à React Native, Expo ni à la base.
- Toute règle métier vit dans `core` et est testée ; les repositories sont les seuls à parler à Kysely ; les écrans passent par des hooks TanStack Query.
- Pas de commentaires SQL isolés dans les migrations (ancien bug de migrations Expo SQLite sur Android).
- **Interface** : passer par `apps/mobile/ui/kit.tsx` (échelle typographique `Overline`, `ScreenTitle`, `Heading`, `CardTitle`, `Body`, `Label`, `Caption`, `Amount`/`Display` en chiffres tabulaires ; `Card`, `ListCard`, `ActionButton`, `IconButton`, `ScreenHeader`, `StackHeader`, `ModalHeader`, `KeyValue`, `DateField` ; marge sous la barre d'état `pt={insets.top + TOP_GAP.tab}` (32) pour les onglets, `TOP_GAP.stack` (20) pour les autres écrans). Pas de `fontSize` ni de bouton maison dans les écrans. Icônes lucide uniquement, jamais de glyphes texte (‹ › + ✓). Montants avec `formatEuros`, pourcentages avec `formatPercentBp` (espace insécable avant € et %). Un seul bouton plein par vue ; danger réservé aux actions destructrices. Fenêtres de confirmation et messages : `showDialog` / `showError` (`ui/dialog.tsx`, même signature qu'`Alert.alert`, option `tone` et `cancelable`), jamais `Alert.alert`. Choix dans une liste : ligne « libellé → valeur › » qui ouvre un `BottomSheet` avec des `SheetOption` (`ui/sheet.tsx`, le même panneau que les dialogues) ; choix binaire : `Segmented` (`ui/Segmented.tsx`). Mouvement : `ui/motion.tsx` (courbes courtes sans rebond, décalages de 6 à 10 px ; `haptic.select/tap/success/warn/error`, `Appear` pour les éléments de liste avec cascade et sortie, `Reveal` pour un contenu dépliable, `Settle` pour que les voisins glissent) ; retour de pression discret via `scale="1 press:0.985" transition="fast"` (déjà dans le kit). **Jamais de ressort** : les préréglages Tamagui (`quick`, `bouncy`, même `…LessBouncy`) et `withSpring`/`springify` rebondissent ; utiliser `transition="fast"` (120 ms) ou `"smooth"` (200 ms), définis en `timing` dans `tamagui.config.ts`, et `withTiming`/`.duration().easing()` côté Reanimated ; transitions de pile `ios_from_right`, modales `slide_from_bottom` sans geste de fermeture (`gestureEnabled: false`, pour ne pas perdre une saisie), onglets `shift`. Mise en forme : `npx prettier --write --print-width 140 --single-quote`.
- **Profondeur et verre** (20/11/2026) : ombres uniquement via `ui/elevation.ts` (`shadow.sm/md/lg/glow/…`, `RADIUS.card/row/control/glass`), jamais de `boxShadow` écrit à la main. Écrans d'onglet et Statistiques : en-tête `Hero` (`ui/Hero.tsx`, dégradé aubergine en `backgroundImage` natif) + `ScreenHeader onHero` / `StackHeader onHero`, barre d'état claire tant que l'écran a le focus. Sur le dégradé : `GlassCard` / `GlassPanel` (`ui/Glass.tsx`, verre sombre teinté, sans flou), `HeroAmount`, `IconButton variant="glass"`, `Segmented onGlass`, couleurs `onGlass*` (contrastes mesurés). Formulaires d'abonnement en feuille du bas (`ui/SheetScreen.tsx`, route `transparentModal`, ni poignée ni fermeture par glissement). Barre d'onglets flottante unique (`ui/TabBar.tsx`, capsule « iris », flou Dimezis réglable par `ANDROID_BLUR`). Titres et grands montants en Space Grotesk (`DISPLAY_FONT`, sans `fontWeight`). Après un changement qui ne se voit pas dans Expo Go : `npx expo start --go --clear`.

## Palette (tokens Tamagui)
primary `#4C1E4F`, secondary `#F6D5C4` (pêche) (fond uniquement, texte `#4C1E4F` dessus), succès `#214F1E`, fond `#F5F6F4`, surface `#FFFFFF`, bordure (séparateurs) `#E3E6E3`, bordure de contrôle `borderControl` `#838C94` (champs, puces, 3:1), fond neutre `subtle` `#E9ECE9`, texte `#14181B`, texte atténué `#5B6670`, alerte fond/bordure/texte `#FFF4E5` / `#F0C48A` / `#7A3E00`, danger fond/texte `#FDE8E8` / `#8A1C1C`. Zones tactiles ≥ 44 px, contrastes ≥ 4,5:1.

## État d'avancement
1. Fait : conception, maquettes, schéma, décisions v1 (`modele-de-donnees.md` sections 9 et 10), migrations `001_init`, `002_transfer_rescheduled`, `003_settings_onboarding` et `004_settings_toggles` (interrupteurs `reminders_enabled` et `ai_suggestion_enabled`).
2. Fait : **spike validé le 19/11/2026** sur le téléphone (Xiaomi, MIUI 12.5, Android 11), en APK release Hermes : démarrage, animation Reanimated via Tamagui, deux migrations Kysely sur expo-sqlite, lecture après écriture avec TanStack Query. L'écran `app/index.tsx` est un écran de test, à remplacer.
3. Fait : `packages/core` (91 tests Vitest, `pnpm test` dans `packages/core`) : `money`, `calendar` (fériés, Pâques), `charges` (génération 13 mois), `funding` (dates de transfert, regroupement, date de paie), `balance` (solde, résidu, alerte essai oublié), `payday` (virement de paie, provisions), `lifecycle` (machine à états, questions J+1), `regeneration` (régénération sur place), `reconciliation` (rapprochement, prélèvement inconnu).
4. Fait (19/11/2026) : repositories et commandes (`db/sync.ts` régénère charges et transferts en transaction, `db/commands.ts` : création, transition, archivage ; 28 tests), écrans Accueil (`app/(tabs)/index.tsx`, `db/repositories/home.ts`), Plan (`app/(tabs)/plan.tsx`, `db/repositories/plan.ts`), Abonnements (`app/(tabs)/abonnements.tsx`), Ajout (`app/subscriptions/new.tsx`), Fiche (`app/subscriptions/[id].tsx`), Rapprochement (`app/charges/[id].tsx`, commandes dans `db/reconcile.ts`, maintenance quotidienne). 46 tests.
5. Fait (19/11/2026) : Statistiques (`app/stats.tsx`), Réglages et premier lancement (`app/(tabs)/reglages.tsx`, `components/Onboarding.tsx`, migration `003`), Modifier (`app/subscriptions/edit/[id].tsx`, formulaire partagé `components/SubscriptionForm.tsx`), prélèvement inconnu (`app/charges/unknown.tsx`) et transfert correctif, notifications (`notifications/`), export/import (`db/backup.ts`), verrouillage biométrique (`components/LockGate.tsx`), logos Simple Icons et icônes d'onglets (lucide), fonction `/enrich` en Go (`apps/enrich`, 9 tests). Précisions : `modele-de-donnees.md` 10.15. 85 tests app.
6. Fait (19/11/2026) : `/enrich` déployé à la main depuis la console Scaleway (Paris, fonction `enrich`, handler `Handle`, variables secrètes `ANTHROPIC_API_KEY` et `ENRICH_SECRET`, archive `apps/enrich/dist/enrich.zip` = `go.mod`, `go.sum` et les `.go` hors tests ; `go.mod` en `go 1.25` pour rester compatible avec le runtime). Secret partagé local : `~/.config/sluis/enrich.secret`. Testé : 405 en GET, 401 sans secret, 200 avec.
7. Adresse et secret de `/enrich` intégrés au build via `apps/mobile/.env.local` (ignoré par git, `EXPO_PUBLIC_ENRICH_URL`, `EXPO_PUBLIC_ENRICH_SECRET`) : rien à saisir dans l'app, Réglages affiche seulement l'état. Le secret est donc dans l'APK (app perso, garde-fous : limite de débit et plafond de dépense Anthropic). Changer `.env.local` impose de relancer Metro ou de rebuilder.
8. Code fait (19/11/2026), déploiement à faire : soldes Revolut via Enable Banking (mode restreint, application « Abonnements », lecture seule). Fonction Scaleway dédiée, handler `HandleBalances` (même archive que `/enrich`, `apps/enrich/balances.go`, même secret `ENRICH_SECRET` ; adresse dans `EXPO_PUBLIC_BALANCES_URL` de `.env.local`, à défaut `/balances` de la fonction `/enrich`), en-têtes PSU transmis pour une lecture « utilisateur présent ») ; variables secrètes `EB_APP_ID`, `EB_PRIVATE_KEY` (PEM en base64), `EB_SESSION_ID`, `EB_ACCOUNT_CURRENT`, `EB_ACCOUNT_VAULT`, valeurs dans `~/.config/sluis/scaleway-balances.env` (clé : `~/.config/sluis/enablebanking.pem`, session : `enablebanking.session.json`). Rien n'est stocké côté serveur. App : `features/balances.ts`, carte `components/BalancesCard.tsx` en tête de l'Accueil (tirer pour actualiser, couverture des transferts à venir) et ligne `VaultCoverage` dans le Plan. Accord valable jusqu'au 17/05/2027 : le renouveler (nouvel accord `/auth` puis `/sessions`, mettre à jour `EB_SESSION_ID`) ; l'Accueil prévient 14 jours avant.
9. À faire : build APK release (`expo prebuild` nécessaire pour les plugins notifications et biométrie) ; usage réel un mois.
- Développement au quotidien : Expo Go (`npx expo start --go` dans `apps/mobile`, `adb reverse tcp:8081 tcp:8081`). La base est ouverte une seule fois par app (`db/provider.tsx`) : deux connexions simultanées bloquent le thread JS en mode dev.

## Build Android local
- APK release : `cd apps/mobile/android && ./gradlew assembleRelease` (sortie dans `app/build/outputs/apk/release/`). Premier build environ 16 min.
- Development build (`expo-dev-client`) : `./gradlew assembleDebug`, puis `npx expo start` dans `apps/mobile` et `adb reverse tcp:8081 tcp:8081`.
- MIUI refuse souvent `adb install` (`INSTALL_FAILED_USER_RESTRICTED`, fenêtre de confirmation qui expire) : copier l'APK avec `adb push <apk> /sdcard/Download/` et l'installer depuis le gestionnaire de fichiers.

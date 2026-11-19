# App Gestion d'abonnements — Fiche de stack (v1)

Application mobile personnelle, mono-utilisateur, **Android uniquement**, local-first. Un seul backend minimal pour l'enrichissement IA.

## 1. Décisions

| Sujet | Décision |
|---|---|
| Plateforme | Android uniquement pour la v1 |
| Framework | React Native + Expo (dev client, EAS Build), TypeScript strict |
| Navigation | Expo Router |
| UI | **Tamagui** (composants, thèmes, tokens) |
| Animations | **Reanimated 4** via le pilote d'animation de Tamagui |
| Base locale | `expo-sqlite` |
| Accès aux données | **Kysely** + dialecte communautaire Expo + migrations SQL écrites à la main |
| Cache / réactivité | **TanStack Query** (invalidation après chaque écriture) |
| Domaine métier | Package TS pur `core` (aucune dépendance React Native) |
| Validation | Zod côté app (réponse `/enrich`, import JSON) ; contrat de référence en JSON Schema, validé aussi côté Go |
| Formulaires | React Hook Form + Zod |
| Backend IA | Fonction serverless **Go** sur **Scaleway Serverless Functions**, une route `POST /enrich` |
| Tests | **Vitest** (`core` et base de données sous Node), `jest-expo` seulement pour d'éventuels tests de composants, Maestro en option |
| CI / livraison | GitHub Actions, EAS Build, installation directe de l'APK |

## 2. Structure du dépôt

```
abonnements/
├─ apps/
│  ├─ mobile/                  Expo + Tamagui + écrans
│  │  ├─ app/                  routes Expo Router
│  │  ├─ ui/                   composants maison (styled Tamagui)
│  │  ├─ db/
│  │  │  ├─ client.ts          instance Kysely + dialecte
│  │  │  ├─ types.ts           interface DB (Generated, Selectable, Insertable)
│  │  │  ├─ migrations/        001_init.ts, 002_...
│  │  │  └─ repositories/      subscription, charge, transfer, event, settings
│  │  ├─ features/             hooks TanStack Query par fonctionnalité
│  │  ├─ notifications/        planification et replanification
│  │  └─ tamagui.config.ts     tokens et thème
│  └─ enrich/                  fonction POST /enrich (module Go indépendant)
│     ├─ main.go / handler.go  point d'entrée et gestion HTTP
│     ├─ claude.go             appel à l'API Claude
│     ├─ validate.go           validation de la sortie
│     └─ *_test.go             tests Go
├─ contracts/
│  └─ enrich.schema.json       contrat de référence de POST /enrich (JSON Schema)
├─ packages/
│  └─ core/                    domaine pur + schémas Zod côté app
│     ├─ money.ts              centimes, marges en points de base, arrondi
│     ├─ calendar.ts           jours ouvrés, jours fériés (Pâques), fins de mois
│     ├─ charges.ts            génération des prélèvements (horizon 13 mois)
│     ├─ funding.ts            dates de transfert, regroupement, virement de paie
│     ├─ risk.ts               alerte « essai oublié », résidu
│     ├─ lifecycle.ts          machine à états des abonnements et effets de bord
│     └─ schemas.ts            Zod : réponse /enrich, import/export JSON
└─ pnpm-workspace.yaml
```

**Règle de dépendance** : `core` ne dépend de rien (ni React Native, ni base, ni Expo). L'app et le backend dépendent de `core`, jamais l'inverse.

## 3. Couche données

### 3.1 Kysely sur Expo SQLite

Kysely n'a pas de dialecte officiel pour Expo SQLite. Plusieurs dialectes communautaires existent (`kysely-expo`, `kysely-expo-sqlite-dialect`, `kysely-dialect-expo`). Le choix se fait **à l'init**, selon la version d'Expo SDK retenue et la maintenance récente. Le dialecte est une couche fine : le changer ensuite reste peu coûteux.

Réglages à l'ouverture de la base :
- `PRAGMA foreign_keys = ON`
- `PRAGMA busy_timeout = 5000`
- `PRAGMA journal_mode = WAL`

### 3.2 Migrations

- Écrites en SQL (via `sql` de Kysely) à partir de `schema-reference.sql`, découpées en fichiers `001_init`, `002_...`.
- Pas de lecture de dossier à l'exécution : un provider maison (ou celui fourni par le dialecte) expose un objet statique `{ '001_init': { up, down } }`.
- Exécutées au démarrage de l'app, avant le premier rendu, avec un écran de chargement.
- Les mêmes migrations tournent sous Node avec `better-sqlite3` pour les tests.

### 3.3 Intégrité et logique

- **En base** : types, `CHECK`, clés étrangères, index, vues, triggers `updated_at`.
- **Dans `core`** : toute règle métier, y compris la cascade « abonnement résilié → charges non financées » (elle doit aussi replanifier les notifications, donc pas de trigger SQL).
- Les repositories sont les seuls à parler à Kysely. Les écrans passent par des hooks TanStack Query.

### 3.4 TanStack Query

- Clés : `['subscriptions']`, `['charges', mois]`, `['plan', mois]`, `['settings']`, `['stats', période]`.
- Toute écriture invalide les clés concernées (le plan dépend des abonnements, des charges et des réglages).
- Pas de `staleTime` agressif : les données sont locales, la requête est quasi instantanée.
- Pas de persistance du cache : la base SQLite est déjà la persistance.

## 4. Interface

### 4.1 Tamagui

- Thème unique clair au départ, tokens repris des maquettes :

| Token | Valeur |
|---|---|
| `background` | `#F5F6F4` |
| `surface` | `#FFFFFF` |
| `border` | `#E3E6E3` |
| `color` | `#14181B` |
| `colorMuted` | `#5B6670` |
| `primary` | `#4C1E4F` (violet profond : fonds forts, boutons, onglet actif, texte d'accent) |
| `onPrimary` | `#FFFFFF` (contraste 13,1:1 sur `primary`) |
| `secondary` | `#F6D5C4` (pêche, remplace le jaune `#DDD78D` le 19/11/2026 : CTA sur fond `primary`, filtre ou pastille sélectionnés) |
| `onSecondary` | `#4C1E4F` (contraste 8,8:1 sur `secondary`) |
| `warnBg` / `warnBorder` / `warnText` | `#FFF4E5` / `#F0C48A` / `#7A3E00` |
| `okBg` / `okText` (succès) | `#E8F5EE` / `#214F1E` (contraste 8,5:1) |
| `dangerBg` / `dangerText` | `#FDE8E8` / `#8A1C1C` |

- **Règle d'usage de `secondary`** : uniquement en fond, avec `onSecondary` dessus. Jamais en texte ou en icône sur fond blanc (contraste 1,5:1). Il reste distinct des couleurs d'alerte (`warn*`, orangées) : les alertes gardent une bordure et une icône pour ne pas se confondre avec lui.
- Les couleurs sémantiques (`ok*`, `warn*`, `danger*`) restent indépendantes de la palette de marque.
- Composants du kit utilisés : `Button`, `Input`, `Switch`, `Slider`, `Select`, `Sheet`, `Progress`, `ToggleGroup`, `Dialog`.
- Composants maison (`styled()`) : carte de transfert, carte d'essai, ligne d'abonnement, badge de statut, ligne de détail.
- Icônes : `@tamagui/lucide-icons`.
- Le compilateur d'optimisation de Tamagui est **désactivé au départ** ; on l'envisage une fois l'app stable.
- Accessibilité : zones tactiles ≥ 44 px, contrastes ≥ 4,5:1, libellés sur les boutons-icônes.

### 4.2 Animations (sobres)

| Où | Quoi |
|---|---|
| Plan du mois | Case « transfert fait » qui se coche |
| Accueil | Entrée des cartes |
| Statistiques | Remplissage des barres de répartition |

### 4.3 Navigation

Expo Router : 4 onglets (Accueil, Plan, Abonnements, Réglages) et des écrans empilés (Fiche, Ajout, Statistiques).

## 5. Notifications et système Android

- `expo-notifications` : notifications **locales**, aucun serveur de push.
- Alarmes exactes : permission `SCHEDULE_EXACT_ALARM` demandée au premier lancement.
- Optimisation batterie : détection et renvoi vers le réglage système via `expo-intent-launcher`.
- Replanification complète au lancement de l'app, après redémarrage du téléphone, et après toute modification d'abonnement ou de réglage.
- Fenêtre glissante de **60 jours** (limite d'alarmes Android).
- Table `scheduled_notification` pour annuler et replanifier proprement.

## 6. Sécurité et données personnelles

- `expo-local-authentication` : verrouillage biométrique à l'ouverture, code de l'appareil en secours.
- `expo-secure-store` : secret d'authentification de l'API `/enrich`.
- Aucune donnée bancaire dans l'app : ni IBAN, ni numéro de carte.
- Seul le **nom** de l'abonnement est envoyé à l'IA.
- Export / import JSON (`expo-file-system`, `expo-sharing`, `expo-document-picker`), versionné par `schema_version`.

## 7. Backend IA

- Une fonction serverless **Go**, route unique `POST /enrich`. Choix assumé : brique petite, isolée et non critique, donc bon terrain d'apprentissage ; l'app reste utilisable sans elle.
- Entrée `{ name }`, sortie `{ category, iconKey, cancelUrl, trialDays, confidence }`.
- Appel à l'API Claude, petit modèle, sortie structurée validée côté Go (catégorie dans la liste autorisée, `iconKey` dans la bibliothèque d'icônes, `cancelUrl` en https), puis revalidée par Zod dans l'app avant tout usage.
- **Contrat** : `contracts/enrich.schema.json` fait foi. Un test de contrat vérifie qu'une réponse du serveur Go passe la validation Zod de l'app, pour éviter toute dérive entre les deux côtés.
- Authentification par secret partagé, limitation de débit pour borner le coût.
- **Hébergeur : Scaleway Serverless Functions** (France, régions européennes, palier gratuit mensuel de 1 M de requêtes et 400 000 GB-s, très au-dessus de l'usage prévu). Runtime Go supporté par le produit.
- **Comptes à créer** : compte Scaleway (carte bancaire demandée, pas celle du compte Revolut réservé aux abonnements) et compte console Anthropic avec une clé dédiée à l'app et une limite de dépense mensuelle.
- **Secrets** : clé Anthropic et secret d'authentification dans les variables secrètes de la fonction ; côté app, secret dans `expo-secure-store`.
- Si l'IA est indisponible, l'app continue avec la catégorie « Autre ».

## 8. Qualité et livraison

| Sujet | Outil |
|---|---|
| Lint / format | ESLint, Prettier |
| Types | `tsc --noEmit` sur chaque package |
| Tests Go | `go test` et `go vet` sur `apps/enrich`, appel à l'API Claude simulé par un faux serveur HTTP |
| Tests unitaires | Vitest sur `core` (priorité absolue) ; base testée sous Node avec `better-sqlite3` et les mêmes migrations (Kysely 0.29 est ESM seul, d'où Vitest plutôt que Jest) |
| Tests de parcours | Maestro (optionnel) sur : ajout d'un essai, passage en actif, résiliation |
| CI | GitHub Actions : lint, types, tests TypeScript et tests Go sur chaque push |
| Build | EAS Build (profil `preview` pour l'APK) |
| Distribution | APK en installation directe, ou piste de test interne Google Play |

**Cas de test obligatoires dans `core`** : fin de mois (29/30/31), jours fériés mobiles (Pâques, Ascension, Pentecôte), week-ends, regroupement de transferts, abonnement annuel provisionné, essai non confirmé, abonnement résilié avec prélèvement ultérieur, marge à 0 % et à 5 %, arrondi au centime supérieur.

## 9. Spike de validation (avant tout écran)

Objectif : prouver que les briques tiennent ensemble sur un vrai téléphone. Durée estimée : une demi-journée.

1. Créer le projet Expo (dev client) et choisir les versions alignées : Expo SDK, React Native, Reanimated 4, `react-native-worklets`, Tamagui.
2. Activer la New Architecture (exigée par Reanimated 4).
3. Brancher Tamagui avec le pilote d'animation Reanimated, afficher un composant animé.
4. Brancher Kysely + le dialecte retenu, lancer **deux migrations** successives et lire une ligne.
5. Brancher TanStack Query sur un repository, vérifier l'invalidation après écriture.
6. Construire l'APK avec EAS et l'installer sur le téléphone.

**Critères de sortie** : l'app démarre sans crash, l'animation tourne, les deux migrations passent, la lecture après écriture se rafraîchit.

**Repli si le spike échoue sur Tamagui ou Reanimated** : `StyleSheet` avec des tokens maison et l'API `Animated` de React Native, sans toucher au reste de la stack.

## 10. Risques et points de vigilance

| Risque | Mitigation |
|---|---|
| Tamagui : runtime natif décrit en bêta, exigences de version React Native élevées | Spike en premier, repli `StyleSheet` |
| Reanimated 4 : New Architecture obligatoire, plugin Babel `worklets` | Aligner les versions à l'init, ne pas mélanger avec Reanimated 3 |
| Dérive du contrat `/enrich` entre le serveur Go et l'app TypeScript | JSON Schema de référence, test de contrat en CI, revalidation Zod côté app |
| Courbe d'apprentissage de Go sur la fonction | Périmètre volontairement minuscule, repli « Autre » côté app si la fonction est indisponible |
| Dialecte Kysely communautaire | Choix selon la maintenance récente et la compatibilité avec Kysely 0.29 (API de migration importée depuis `kysely/migration`), couche fine donc remplaçable |
| Migrations Expo SQLite : anciens plantages sur Android avec plusieurs migrations ou du SQL contenant des commentaires | Tester deux migrations dès le spike, éviter les commentaires seuls dans les statements |
| Alarmes tuées par le constructeur (batterie) | Détection et guidage dans les réglages, replanification au lancement |
| Perte de données si changement de téléphone | Export JSON versionné, rappel périodique d'export |

## 11. Ordre de réalisation

1. Spike (section 9).
2. Package `core` avec ses tests (calendrier, charges, marges, plan, risque).
3. Migration `001_init` et repositories.
4. Écrans dans l'ordre : Abonnements, Ajout, Fiche, Plan, Accueil, Statistiques, Réglages.
5. Notifications locales et gestion batterie.
6. Fonction `/enrich` en Go, contrat JSON Schema et test de contrat, puis branchement dans l'écran d'ajout.
7. Export / import JSON, verrouillage biométrique.
8. Build APK, usage réel pendant un mois avant d'ajouter des fonctionnalités.

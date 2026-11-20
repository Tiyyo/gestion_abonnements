# App Gestion d'abonnements — Modèle de données (v1)

Application mobile personnelle (React Native / Expo, Android), mono-utilisateur, local-first (SQLite). Backend minimal : une fonction `POST /enrich` pour l'IA.

## 0. Conventions

- **Montants** : entiers en centimes (`amount_cents`), jamais de flottants.
- **Dates** : `DATE` ISO (`YYYY-MM-DD`) en fuseau `Europe/Paris`. Horodatages en UTC.
- **Identifiants** : UUID v4 générés côté app (utile pour une future synchronisation).
- **Arrondi** : toujours au centime supérieur sur les montants à alimenter.
- **Suppression** : logique (`archived_at`) pour conserver l'historique.

## 1. Tables

> Les types et noms de colonnes ci-dessous sont ceux de la conception initiale. La base réelle est définie par la migration `apps/mobile/db/migrations/001_init.ts`, qui fait foi : marges en points de base (`*_margin_bp`), `notif_time` au lieu de `notif_hour`, pas de `schema_version` (voir 10.10).

### 1.1 `settings` (1 seule ligne)

| Champ | Type | Description |
|---|---|---|
| `payday_day` | INT 1-31 | Jour de paie (si le mois est plus court, dernier jour du mois) |
| `global_margin_pct` | DECIMAL(3,1) | Marge globale, **0 à 5** |
| `funding_lead_days` | INT | Délai d'alimentation, défaut 1 |
| `default_currency` | TEXT | `EUR` |
| `notif_hour` | TIME | Heure d'envoi des rappels, défaut 09:00 |
| `trial_reminder_days` | JSON | `[3,1]` |
| `cancel_reminder_days` | JSON | `[3,1]` |
| `biometric_lock` | BOOL | Verrouillage à l'ouverture |
| `schema_version` | INT | Migrations |

### 1.2 `category`

| Champ | Type |
|---|---|
| `id` | UUID PK |
| `name` | TEXT UNIQUE |
| `icon_key` | TEXT (clé de la bibliothèque d'icônes embarquée) |
| `sort_order` | INT |

Catégories par défaut : Musique, Vidéo, Stockage cloud, Jeux, Productivité, Presse, Santé/Sport, IA, Autre.

### 1.3 `subscription`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | |
| `category_id` | FK → category | |
| `icon_key` | TEXT | Clé d'icône |
| `amount_cents` | INT | Montant récurrent (hors essai) |
| `currency` | TEXT | ISO 4217 |
| `fx_buffer_pct` | DECIMAL | Marge de change si devise ≠ EUR (optionnel) |
| `period_unit` | ENUM | `week` / `month` / `year` |
| `period_count` | INT | 1 = chaque, 3 = trimestriel (`month` × 3) |
| `anchor_day` | INT | Jour du mois de référence (gère le 29/30/31) |
| `next_charge_date` | DATE | Prochain prélèvement attendu |
| `status` | ENUM | `trial` / `active` / `to_cancel` / `cancelled` |
| `payment_method` | ENUM | `revolut` (défaut) / `other` |
| `margin_pct_override` | DECIMAL NULL | Surcharge, **0 à 5** |
| `trial_end_date` | DATE NULL | Si `trial` |
| `post_trial_amount_cents` | INT NULL | Montant dû après l'essai |
| `period_end_date` | DATE NULL | Fin de période payée (si `to_cancel`) |
| `cancel_done` | BOOL | Résiliation effectuée chez le marchand |
| `cancel_url` | TEXT NULL | |
| `ai_suggestion` | JSON NULL | Dernière suggestion brute de l'IA (traçabilité) |
| `notes` | TEXT NULL | |
| `created_at`, `updated_at`, `archived_at` | TIMESTAMP | |

**Contraintes** : `margin_pct_override` entre 0 et 5 ; `trial_end_date` et `post_trial_amount_cents` obligatoires si `status = trial` ; `period_end_date` obligatoire si `status = to_cancel`.

### 1.4 `charge` (prélèvement prévu puis constaté)

| Champ | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `subscription_id` | FK | |
| `due_date` | DATE | Date attendue |
| `expected_amount_cents` | INT | Montant attendu |
| `funded_amount_cents` | INT | Montant avec marge à alimenter |
| `status` | ENUM | `planned` / `funded` / `paid` / `failed` / `unfunded` / `skipped` |
| `is_trial_conversion` | BOOL | Premier prélèvement après essai |
| `actual_amount_cents` | INT NULL | Constaté |
| `actual_date` | DATE NULL | Constaté |
| `provision_only` | BOOL | Vrai pour la part mensuelle provisionnée d'un abonnement annuel (pas de prélèvement ce mois-là) |

`unfunded` = prélèvement **volontairement non financé** (essai non confirmé, abonnement `to_cancel` ou `cancelled`). C'est le mécanisme qui fait échouer un prélèvement non désiré.

Index : `(due_date)`, `(subscription_id, due_date)`.

### 1.5 `transfer`

| Champ | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `type` | ENUM | `payday` (SG → Revolut → coffre) / `vault_to_main` / `residual_return` |
| `planned_date` | DATE | |
| `amount_cents` | INT | |
| `status` | ENUM | `planned` / `done` / `skipped` |
| `done_at` | TIMESTAMP NULL | |

### 1.6 `transfer_charge` (liaison N-N)

`transfer_id` FK, `charge_id` FK, `amount_cents`. Un transfert `vault_to_main` regroupe plusieurs prélèvements.

### 1.7 `event` (historique et anomalies)

| Champ | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `subscription_id` | FK NULL | |
| `type` | ENUM | `price_change` / `unexpected_charge` / `duplicate` / `post_cancel_charge` / `charge_failed` / `status_change` / `note` |
| `occurred_on` | DATE | |
| `amount_cents` | INT NULL | |
| `payload` | JSON | Détails (ancien/nouveau montant, etc.) |

### 1.8 `ai_correction`

| Champ | Type |
|---|---|
| `name_normalized` | TEXT PK (minuscules, sans accents) |
| `category_id` | FK |
| `icon_key` | TEXT |
| `corrected_at` | TIMESTAMP |

Consultée **avant** tout appel à l'IA : si le nom a déjà été corrigé, on applique la correction sans appel.

### 1.9 `scheduled_notification`

| Champ | Type |
|---|---|
| `id` | UUID PK |
| `kind` | ENUM : `funding` / `trial_end` / `cancel_end` / `payday` / `residual` |
| `ref_id` | UUID (charge, subscription ou transfert) |
| `fire_at` | TIMESTAMP |
| `os_notification_id` | TEXT (identifiant Expo) |

Sert à annuler et replanifier proprement (au lancement, après redémarrage du téléphone, après modification d'un abonnement).

## 2. Machine à états de `subscription.status`

```
          ┌──────── garder ────────┐
  trial ──┤                        ▼
          └─ ne rien faire ─►  (charge unfunded)
                               active ──── décider d'arrêter ───► to_cancel ──── cancel_done + fin de période ───► cancelled
                                 ▲                                    │
                                 └──────────── annuler la décision ───┘
  trial ──── résilier avant la fin ───────────────────────────────► cancelled
```

| Transition | Effets |
|---|---|
| `trial → active` | `next_charge_date = trial_end_date`, `amount_cents = post_trial_amount_cents`, génération des prélèvements, financement activé |
| `trial → cancelled` | Charges futures supprimées, notifications annulées |
| `trial` (aucune action à la fin) | Le prélèvement reste `unfunded` ; s'il passe malgré tout, événement `unexpected_charge` |
| `active → to_cancel` | `period_end_date` requis, charges postérieures passées en `unfunded`, rappels de résiliation planifiés |
| `to_cancel → active` | Charges refinancées, rappels annulés |
| `to_cancel → cancelled` | Seulement si `cancel_done = true` ; sinon l'app demande confirmation |
| `cancelled` | Toute charge réelle ultérieure = événement `post_cancel_charge` |

## 3. Algorithmes

### 3.1 Génération des prélèvements

Horizon glissant de **13 mois**, régénéré au lancement de l'app et à chaque modification.

1. Pour chaque abonnement `trial`, `active` ou `to_cancel` avec `payment_method = revolut` :
   - partir de `next_charge_date` ;
   - avancer selon `period_unit × period_count` ;
   - **fin de mois** : si `anchor_day` > nombre de jours du mois, utiliser le dernier jour du mois (31 janvier → 28 février → 31 mars, sans dérive).
2. Ne jamais régénérer ni écraser une charge `paid`, `failed` ou `skipped`.
3. Statut initial :
   - `trial` : le prélèvement de conversion est `unfunded` tant que l'essai n'est pas confirmé ;
   - `active` : `planned` ;
   - `to_cancel` : `planned` jusqu'à `period_end_date`, `unfunded` au-delà ;
   - `cancelled` : aucune charge.

### 3.2 Marge et montant à alimenter

```
marge = margin_pct_override ?? global_margin_pct        // plafonnée à 5
funded_amount_cents = ceil(expected_amount_cents × (1 + marge / 100))
```

Si la devise ≠ EUR, la marge de change `fx_buffer_pct` s'ajoute, le total restant plafonné à 5 % **sauf** décision explicite de l'utilisateur pour cet abonnement.

### 3.3 Date de transfert `vault_to_main`

Pour une charge de date `D` :
1. `T = D - funding_lead_days`.
2. Si `T` est un samedi, un dimanche ou un jour férié, reculer à **dernier jour ouvré précédent**.
3. Si `D` est un lundi ou un jour férié, `T` est le dernier jour ouvré avant le week-end ou le férié.
4. Si `T` est déjà passé, le transfert est marqué **en retard** et notifié immédiatement.

Jours fériés français calculés par règles (Pâques et dérivés), via une bibliothèque dédiée.

### 3.4 Regroupement

Les charges ayant la même date `T` produisent **un seul** `transfer` ; le détail est dans `transfer_charge`. Les charges `unfunded` n'entrent jamais dans un transfert.

### 3.5 Virement de paie (`payday`)

Pour le mois M (période de paie à paie) :

```
virement = Σ funded_amount_cents des charges planned/funded du mois
         + Σ provisions mensuelles des abonnements annuels
```

Provision annuelle : `funded_amount_cents / 12` par mois, vers le coffre uniquement (pas de transfert vers le principal avant `T`). L'app affiche le cumul provisionné pour chaque abonnement annuel.

Pour un abonnement annuel dont le prélèvement tombe avant d'avoir accumulé la provision (premier cycle), l'écart est signalé : « Provision insuffisante, X € à compléter ».

### 3.6 Résidu

À J+1 d'un prélèvement `paid` : `résidu = funded_amount_cents - actual_amount_cents`. Le résidu cumulé du compte principal est estimé ; fin de mois, un transfert `residual_return` est proposé.

### 3.7 Alerte de risque (essai oublié)

Pour chaque charge `unfunded` à la date `D` :
```
solde_estimé(D) = résidu cumulé estimé + Σ transferts vault_to_main déjà effectués non encore consommés
si expected_amount_cents ≤ solde_estimé(D) → alerte « cet essai pourrait passer »
```
Notification J-3 et J-1 avant `D`, et l'alerte apparaît sur l'accueil.

### 3.8 Rapprochement (saisie manuelle)

Quand l'utilisateur marque une charge :
- **Passée** : saisie du montant réel ; écart ≠ 0 → événement `price_change` et proposition de mise à jour de `amount_cents`.
- **Échouée** : événement `charge_failed` ; si l'abonnement est voulu, l'app propose un transfert correctif et rappelle que le marchand peut retenter.
- **Prélèvement inconnu** : création rapide d'un événement `unexpected_charge` (avec option « créer l'abonnement correspondant »).

## 4. Notifications (planification locale)

| Kind | Déclencheur | `fire_at` |
|---|---|---|
| `funding` | Chaque transfert `vault_to_main` planifié | `T` à `notif_hour` |
| `trial_end` | Chaque abonnement `trial` | `trial_end_date - n` (`n` ∈ `trial_reminder_days`) |
| `cancel_end` | Chaque abonnement `to_cancel` non `cancel_done` | `period_end_date - n` |
| `payday` | Mensuel | Jour de paie à `notif_hour` |
| `residual` | Mensuel | Dernier jour du mois |

Règles :
- **Replanification complète** au lancement, au démarrage du téléphone et après toute modification.
- Limite Android sur le nombre d'alarmes : ne planifier que les **60 prochains jours**, le reste est replanifié glissant.
- Une notification dont l'objet est déjà traité (transfert `done`, essai décidé) est annulée.

## 5. Cas limites (récapitulatif)

| Cas | Traitement |
|---|---|
| Abonnement au 29/30/31 | `anchor_day` + dernier jour du mois, sans dérive |
| Prélèvement un week-end/férié | Transfert avancé, marchand éventuellement décalé : tolérance de ±3 jours dans le rapprochement |
| Hausse de prix | Échec ou écart constaté → `price_change`, mise à jour proposée |
| Devise étrangère | Marge de change, montant réel saisi au rapprochement |
| Abonnement annuel | Provision mensuelle vers le coffre |
| Essai prolongé ou raccourci | Modifier `trial_end_date` régénère charges et rappels |
| Double prélèvement | Détecté si 2 charges réelles pour le même abonnement à moins de la moitié de la période |
| Changement de jour de paie | Recalcul du plan du mois courant et suivants |
| Téléphone changé | Export/import JSON de toutes les tables |
| IA indisponible | Catégorie « Autre », icône générique, saisie jamais bloquée |

## 6. Contrat de l'API `POST /enrich`

**Requête**
```json
{ "name": "Spotify" }
```
**Réponse**
```json
{
  "category": "Musique",
  "iconKey": "spotify",
  "cancelUrl": "https://...",
  "trialDays": 30,
  "confidence": 0.9
}
```
- Seul le **nom** est envoyé (aucun montant, aucune donnée bancaire).
- Validation serveur : `category` ∈ liste autorisée, `iconKey` ∈ bibliothèque d'icônes, `cancelUrl` bien formée (https).
- Authentification par secret, limitation de débit.
- Toute valeur issue de l'IA est présentée comme **suggestion à vérifier**.

## 7. Export / import

JSON versionné (`schema_version`) contenant `settings`, `category`, `subscription`, `charge`, `transfer`, `transfer_charge`, `event`, `ai_correction`. L'import remplace ou fusionne (au choix) et déclenche une replanification complète des notifications.

## 8. Étapes suivantes

1. Maquettes des 7 écrans (Accueil, Plan du mois, Abonnements, Fiche, Ajout, Statistiques, Réglages).
2. Schéma SQL et migrations (Expo SQLite ou WatermelonDB).
3. Module de calcul (génération, plan, jours fériés) en TypeScript pur, **testé unitairement** (fin de mois, fériés, regroupements, annuel).
4. Fonction `POST /enrich`.
5. Planification des notifications et gestion des restrictions batterie Android.

## 9. Décisions v1 (19/11/2026)

Ces décisions complètent ou remplacent les sections 3 et 5. En cas de conflit, cette section fait foi. Chaque décision donne lieu à au moins un test dans `packages/core`.

### 9.1 Devise : euro uniquement

- La v1 ne gère que l'euro : `currency = 'EUR'`, `fx_buffer_bp = 0`, aucun champ devise à l'écran.
- La marge effective est `margin_override_bp ?? global_margin_bp`, toujours comprise entre 0 et 500. L'exception « dépassement sur décision explicite » est abandonnée.
- Les colonnes `currency` et `fx_buffer_bp` sont conservées en base pour une version ultérieure.

### 9.2 Solde estimé du compte principal

Une seule formule sert au résidu (3.6) et à l'alerte de risque (3.7).

```
solde(date) =   Σ transferts vault_to_main 'done' (done_at ≤ date)
              − Σ actual_amount_cents des charges 'paid' (actual_date ≤ date)
              − Σ transferts residual_return 'done' (done_at ≤ date)
              − Σ amount_cents des événements unexpected_charge / duplicate / post_cancel_charge
                non rattachés à une charge (occurred_on ≤ date)
```

- Une charge `failed` ne sort rien : son argent reste sur le compte et apparaît naturellement dans le solde.
- **Résidu à renvoyer** à une date = `solde(date) − Σ funded_amount_cents des charges 'funded' pas encore passées`. L'argent déjà transféré pour un prélèvement à venir reste sur le compte et ne fait pas partie du résidu.

### 9.3 Alerte « essai oublié » (remplace 3.7)

Pour chaque charge `unfunded` de date `D` :

```
solde_projeté(D) =   solde(aujourd'hui)
                   + Σ transferts vault_to_main 'planned' de date ≤ D
                   − Σ funded_amount_cents des charges planned/funded de date < D
```

- Les charges prélevées le même jour `D` ne sont **pas** déduites, car l'ordre de passage est inconnu. C'est le choix prudent.
- Si `expected_amount_cents ≤ solde_projeté(D)`, l'app affiche l'alerte « cet essai pourrait passer » sur l'accueil et sur le plan, et l'ajoute au texte des rappels J-3 / J-1 de fin d'essai.
- Le plan de transferts n'est jamais modifié pour éviter le risque. L'app alerte seulement.
- Cas de test de référence : Spotify transféré le 20/11 (12,35 €) pour un prélèvement le 21/11, Disney+ en essai prélève 9,99 € le 20/11. L'app doit alerter.

### 9.4 Virement de paie

- **Date** : `payday_day` du mois, ramené au dernier jour du mois s'il est plus court. S'il tombe un week-end ou un jour férié, la date est reportée au **jour ouvré suivant**.
- **Période de paie P** : de la date effective d'un virement de paie (incluse) à la suivante (exclue).
- **Rattachement** : une charge appartient à la période qui contient sa date de transfert `T`, et non sa date de prélèvement `D`. L'argent doit en effet être dans le coffre avant `T`.
- Quand un transfert et le virement de paie tombent le même jour, le virement de paie passe en premier. Les deux apparaissent dans cet ordre dans le plan.

### 9.5 Provision des abonnements de plus d'un mois (remplace 3.5)

- **Concerné** : tout abonnement dont la période dépasse un mois (`month` × 2 ou plus, `year`). Les abonnements hebdomadaires et mensuels ne sont jamais provisionnés.
- **Montant par période de paie** : `ceil(funded_amount_cents / nombre de mois de la période)`, marge comprise. Pour un abonnement à 50,00 € avec 3 % de marge : 51,50 € / 12 = **4,30 €** (arrondi au centime supérieur).
- **Mois du prélèvement** : la période de paie qui contient le `T` de la charge réelle ne reçoit pas de provision. Elle reçoit seulement le **complément** `max(0, funded_amount_cents − provision cumulée)`. Après le prélèvement, la provision cumulée repart de 0.
- **Premier cycle** : si la provision n'a pas eu le temps de s'accumuler, le complément couvre l'écart. L'écran affiche alors « Provision insuffisante, X € à compléter ».
- **Stockage** : chaque provision est une ligne `charge` avec `provision_only = 1`, `due_date` = date du virement de paie, et `expected_amount_cents` = `funded_amount_cents` = montant provisionné. Elle passe à `funded` quand le virement de paie est marqué fait. La provision cumulée est la somme des provisions `funded` depuis le dernier prélèvement réel de l'abonnement.
- **Liaison** : le virement de paie est relié par `transfer_charge` aux charges et aux provisions qu'il couvre, avec le montant réellement inclus pour chacune (montant à alimenter, complément ou provision).

```
virement_paie(P) =   Σ funded_amount_cents des charges planned/funded (provision_only = 0, période ≤ 1 mois) dont T ∈ P
                   + Σ compléments des abonnements longs dont la charge a son T ∈ P
                   + Σ provisions des abonnements longs dont aucune charge n'a son T ∈ P
```

### 9.6 Essai

- Pendant l'essai, `amount_cents = post_trial_amount_cents`. L'écran d'ajout n'a qu'un seul champ « Montant après essai ».
- `trialDays`, renvoyé par `/enrich`, sert uniquement à préremplir la date de fin d'essai (date du jour + `trialDays`).
- Un abonnement en `trial` ne génère **qu'une seule** charge : la conversion (`is_trial_conversion = 1`, `due_date = trial_end_date`, `unfunded`). Les charges suivantes ne sont générées qu'au passage en `active`.
- **Sans décision à la date de fin**, une notification est envoyée à J+1 (kind `trial_end`, `fire_at = trial_end_date + 1`) : « Le prélèvement de X est-il passé ? ».
  - **Échoué** : la charge passe à `failed`, l'abonnement passe à `cancelled`, et un événement `charge_failed` est enregistré.
  - **Passé** : la charge passe à `paid` avec le montant réel, et un événement `unexpected_charge` est enregistré. L'app propose ensuite **Garder**, qui fait passer l'abonnement en `active`, ou **Résilier**, qui le fait passer en `to_cancel` avec `period_end_date` = veille du prochain prélèvement théorique.
  - **Sans réponse** : la question reste affichée sur l'accueil tant que la charge de conversion est `unfunded` et que sa date est passée. Cet état est calculé, il n'est pas stocké.

### 9.7 Régénération des charges et des transferts

- **Clé de rapprochement** : `(subscription_id, due_date, provision_only)`, déjà unique en base. À chaque régénération, `core` calcule l'ensemble des charges attendues, puis :
  - une charge attendue qui existe déjà en `planned` ou `unfunded` est **mise à jour sur place** : même `id`, avec ses montants et son statut recalculés ;
  - une charge attendue qui n'existe pas est créée ;
  - une charge `planned` ou `unfunded` qui n'est plus attendue est supprimée, avec ses liens `transfer_charge` et ses notifications ;
  - les charges `paid`, `failed` et `skipped` ne sont jamais touchées.
- **Charge déjà financée** (`funded`, transfert fait) qui n'est plus attendue, par exemple après une résiliation : elle passe à `skipped` et garde son `funded_amount_cents`. L'argent correspondant ressort dans le résidu (9.2).
- **Charge déjà financée dont le montant change** : son `funded_amount_cents` reste celui du transfert fait. L'écart sera traité au rapprochement (`price_change`).
- **Transferts** : les transferts `planned` sont reconstruits par `(type, planned_date)` en réutilisant leur `id` s'il existe. Les transferts `done` et `skipped` ne sont jamais modifiés.
- **Statut `funded`** : une charge passe de `planned` à `funded` quand son transfert `vault_to_main` est marqué fait.
- **`next_charge_date`** : c'est la `due_date` de la plus proche charge non provisionnelle de l'abonnement qui ne soit ni `paid`, ni `failed`, ni `skipped`. Elle est recalculée après chaque rapprochement et chaque régénération.

## 10. Décisions v1, compléments (19/11/2026)

Ces règles complètent la section 9 et font foi sur les sections 2, 3.8, 4, 6 et 7.

### 10.1 Reporter un transfert

- Le bouton « Reporter » ouvre un sélecteur de date. Les bornes sont :
  - au plus tôt, la date du jour ;
  - au plus tard, la date de prélèvement la plus proche parmi les charges du transfert, incluse.
- Si la date choisie est le jour même du prélèvement, l'app avertit : « le prélèvement peut échouer si le marchand passe avant ton virement ».
- **Stockage** : `planned_date` garde la date calculée, qui sert de clé de regroupement en régénération. La date choisie va dans la nouvelle colonne `transfer.rescheduled_date` (migration `002`). La date effective est `COALESCE(rescheduled_date, planned_date)`. Elle est utilisée partout : plan, notifications, retard, solde projeté (9.3).
- **Régénération** : la date reportée est conservée tant qu'elle reste antérieure ou égale au prélèvement le plus proche. Sinon, elle est effacée et l'app notifie le changement.

### 10.2 Transfert en retard

- Un transfert est en retard quand il est encore `planned` et que sa date effective est passée. Il s'affiche en tête de l'accueil, en couleurs `danger*`.
- Une notification est envoyée au lancement de l'app, au plus une fois par jour.
- L'action « Marquer fait » reste disponible. Si la date du prélèvement est elle aussi passée, la charge part au rapprochement (10.5).

### 10.3 Fin de période d'un abonnement « à résilier »

- Si `cancel_done = 1`, l'abonnement passe automatiquement à `cancelled` le lendemain de `period_end_date`. Ce passage est vérifié au lancement et doit pouvoir être rejoué sans effet de bord. Un événement `status_change` est enregistré.
- Si `cancel_done = 0`, une notification est envoyée à J+1 (kind `cancel_end`, `fire_at = period_end_date + 1`) : « As-tu bien résilié X ? ».
  - **Oui** : `cancel_done = 1`, puis passage à `cancelled`.
  - **Non** : l'abonnement reste `to_cancel`, ses charges restent `unfunded`. La question reste affichée sur l'accueil et revient en rappel J-3 avant le prochain prélèvement.
- Un prélèvement qui passe sur un abonnement `to_cancel` donne un événement `unexpected_charge`. Sur un abonnement `cancelled`, il donne un événement `post_cancel_charge` (10.5).

### 10.4 Cycle de vie, compléments

- **Réactiver** un abonnement `cancelled` le fait passer à `active`. L'utilisateur saisit la date du prochain prélèvement, puis les charges sont régénérées.
- **Supprimer** pose `archived_at`. Toute action est possible à tout statut, après confirmation. Un abonnement archivé disparaît de toutes les listes, des statistiques et de la génération des charges. Il reste dans l'historique et dans l'export.
- **Filtres de la liste** :
  - « Tous » montre les statuts `trial`, `active` et `to_cancel` ;
  - les autres filtres sont Essai, Actifs, À résilier et **Résiliés**.

### 10.5 Rapprochement (remplace 3.8)

Une charge non provisionnelle dont la date est passée et qui est encore `planned`, `funded` ou `unfunded` apparaît sur l'accueil dans « À vérifier ». Aucune notification n'est envoyée pour elle, sauf les questions J+1 décrites en 9.6 et 10.3.

**Marquer comme passée.** L'utilisateur saisit le montant réel (prérempli avec le montant attendu) et la date (préremplie avec la date de prélèvement). La charge passe à `paid`.
- Si le montant diffère : un événement `price_change` est enregistré, et l'app propose de mettre à jour `amount_cents`, puis régénère les charges (9.7).
- Si la charge était `unfunded` : un événement `unexpected_charge` est enregistré, puis le parcours de 9.6 (essai) ou 10.3 (à résilier) s'applique.

**Marquer comme échouée, sur une charge voulue.** L'argent transféré est resté sur le compte. L'app propose deux choix :
- « Le marchand va retenter » : la charge reste `funded` et revient dans « À vérifier » trois jours plus tard ;
- « Abandonner » : la charge passe à `failed`, un événement `charge_failed` est enregistré, et l'argent ressort dans le résidu.

Si l'échec vient d'une hausse de prix (nouveau montant saisi supérieur au montant alimenté), l'app propose un **transfert correctif** `vault_to_main` du jour, égal à la différence et relié à la charge. Elle n'en propose jamais d'autre : l'argent est déjà sur le compte.

**Saisir un prélèvement inconnu**, depuis le Plan. L'utilisateur saisit le nom, le montant et la date. L'app cherche l'abonnement par son nom normalisé, puis applique la première règle qui correspond :
1. une charge ouverte de cet abonnement est à ±3 jours : l'app propose « c'est ce prélèvement » et la marque comme passée ;
2. l'abonnement est `cancelled` : un événement `post_cancel_charge` est enregistré ;
3. une charge `paid` du même abonnement date de moins d'une demi-période : un événement `duplicate` est enregistré ;
4. sinon : un événement `unexpected_charge` est enregistré, avec l'option « créer l'abonnement ».

Ces événements ne sont rattachés à aucune charge. Leur montant entre dans le solde estimé (9.2).

### 10.6 Icônes

- **Logos de marque** issus de Simple Icons. La version exacte est fixée à l'init. Les icônes sont sous licence CC0, mais les marques appartiennent à leurs titulaires : ce choix est acceptable pour une app personnelle distribuée par APK. Il faudra le réexaminer en cas de publication sur un store.
- **Sous-ensemble embarqué** : une liste choisie de marques d'abonnement est générée au build dans `apps/mobile/ui/brand-icons.ts` (chemin SVG et couleur de marque, rendu avec `react-native-svg`). Cette liste fait foi : c'est l'ensemble des `iconKey` autorisées, partagé avec `/enrich`.
- **Rendu** : le logo est affiché dans la couleur de la marque sur une pastille `surface`. Si le contraste est inférieur à 3:1 (seuil des éléments graphiques), le logo est affiché en `color`.
- **Repli** : si `icon_key` ne figure pas dans la liste (valeur par défaut `'tag'` comprise), l'app affiche l'initiale du nom sur une pastille. La couleur est choisie parmi 6 paires contrastées, de façon déterministe à partir du nom. Rien n'est stocké en base.
- L'utilisateur peut choisir ou changer le logo dans le formulaire de modification. Une correction est mémorisée dans `ai_correction.icon_key`.
- `category.icon_key` reste une icône Lucide, utilisée uniquement pour les catégories (statistiques, filtres).

### 10.7 Contrat `/enrich` (remplace 6)

`contracts/enrich.schema.json` fait foi.
- **Requête** : `{ "name": string }`, de 1 à 100 caractères.
- **Réponse** : `{ category, iconKey, cancelUrl, trialDays, confidence }`.
  - `category` est l'un des 9 noms de catégorie.
  - `iconKey` est un slug Simple Icons ou `null`. Son appartenance à la liste embarquée est vérifiée dans le code, côté Go et côté app.
  - `cancelUrl` est une URL https ou `null`.
  - `trialDays` est un entier entre 0 et 365, ou `null`. Il sert uniquement à préremplir la fin d'essai.
  - `confidence` est un nombre entre 0 et 1.

### 10.8 Historique d'un abonnement

- **Création** : un événement `status_change` est enregistré avec `payload = {"from": null, "to": "<statut>"}`. Aucun nouveau type d'événement n'est ajouté.
- **Rappels** : l'historique affiche les lignes de `scheduled_notification` dont `fire_at` est passé. Le libellé « notification envoyée » est une approximation : l'app ne sait pas si la notification a été affichée.
- La replanification ne touche **que les notifications futures**. Les lignes passées sont gardées 13 mois, puis purgées.

### 10.9 Notifications, compléments

`ref_id` est toujours renseigné, pour que la contrainte d'unicité soit effective :

| Kind | `ref_id` |
|---|---|
| `funding`, `payday` | id du transfert |
| `trial_end`, `cancel_end` | id de l'abonnement |
| `residual` | `residual:YYYY-MM` |

Le repository refuse un `ref_id` nul.

### 10.10 Export / import (remplace 7)

- **Format** : `{ "format": 1, "migration": "<nom de la dernière migration>", "exportedAt": "<ISO UTC>", "tables": { ... } }`. Les tables exportées sont celles de la section 7. `scheduled_notification` est exclue.
- **Import en remplacement seulement**. La fusion est abandonnée. Le déroulé est le suivant :
  1. le fichier est validé entièrement par Zod avant toute écriture ;
  2. l'utilisateur confirme ;
  3. un export de sécurité automatique de la base actuelle est fait ;
  4. dans une seule transaction : suppression de toutes les tables, migrations jusqu'à la migration du fichier (`migrateTo`), insertion des données, puis `migrateToLatest` ;
  5. replanification complète des notifications.
- Un fichier dont la migration est plus récente que celle de l'app est refusé, avec le message « mets à jour l'app ».

### 10.11 Écrans complémentaires

- **Ajout, statut Actif** : le champ « Fin d'essai » devient « Prochain prélèvement », et le libellé du montant devient « Montant ».
- **Périodicité** : Hebdomadaire, Mensuel, Trimestriel, Semestriel, Annuel, Tous les 2 ans (`period_unit` × `period_count`). `anchor_day` vient de la date saisie.
- **Modifier** : c'est le formulaire d'ajout prérempli, avec en plus :
  - le logo, la marge propre (curseur de 0 à 5 %, « marge globale » par défaut), le moyen de paiement et les notes ;
  - une confirmation qui liste les effets quand une modification touche une charge dont le transfert est déjà fait (9.7).
- **Fiche d'un abonnement actif** : montant et périodicité, prochain prélèvement, transfert prévu (date et montant), marge appliquée, moyen de paiement, lien de résiliation, provision cumulée pour un abonnement long, historique.
  - Action « Arrêter » : une feuille demande la date de fin de période, préremplie avec la veille du prochain prélèvement. L'abonnement passe à `to_cancel`.
- **Fiche d'un abonnement à résilier** : alerte de fin de période, case « Résiliation faite », bouton « Ouvrir le lien », action « Annuler la décision » (retour à `active`).
- **Fiche d'un abonnement résilié** : actions « Réactiver » et « Supprimer ».
- **Rapprochement** : une feuille sur la charge propose « Passée » ou « Échouée ». Un bouton « + » sur le Plan ouvre la saisie d'un prélèvement inconnu.
- **Accueil** : l'ordre des blocs est :
  1. transferts en retard ;
  2. prochain transfert ;
  3. questions J+1 (essai, résiliation) ;
  4. essais à décider ;
  5. « À vérifier » ;
  6. prochains prélèvements.

  « Tout voir » ouvre le Plan.
- **Statistiques, onglet Annuel** : coût annualisé des abonnements actifs (hebdomadaire × 52 / `period_count`, mensuel × 12 / `period_count`, annuel / `period_count`), la même répartition par catégorie, puis « Dépensé sur 12 mois » = somme des `actual_amount_cents` payés.
- **Réglages** :
  - le libellé du délai devient « J-1, avancé au dernier jour ouvré » ;
  - deux boutons « Exporter » et « Importer ».
- **Premier lancement** : trois étapes. D'abord le jour de paie, puis la marge globale, puis les permissions (notifications, alarmes exactes, optimisation batterie).
- **États vides** : sur l'accueil et sur la liste, un appel à ajouter un premier abonnement.

### 10.12 Précisions issues du développement de `core`

- **Événement rattaché à une charge** : quand un prélèvement non financé passe malgré tout, la charge passe à `paid`. L'événement `unexpected_charge` qui l'accompagne porte `payload.chargeId`. Un tel événement n'entre **pas** dans le solde estimé (9.2) : son montant est déjà compté par la charge `paid`. Seuls les événements de débit sans `chargeId` sont déduits.
- **Résidu** : l'argent réservé couvre toutes les charges `funded`, y compris celles dont la date est passée mais qui ne sont pas encore rapprochées. C'est le choix prudent : on ne renvoie pas au coffre l'argent d'un prélèvement peut-être déjà débité.

### 10.13 Précisions issues du développement du Plan

- **Liaison du virement de paie** : seules les lignes de provision (`provision_only = 1`) sont reliées au virement de paie par `transfer_charge`. Les prélèvements et les compléments restent reliés à leur seul transfert coffre → compte. Sinon, la vue `v_upcoming_charge` renverrait chaque prélèvement en double.
- **Montant figé** : une fois le virement de paie marqué fait, le Plan affiche le montant enregistré. Le détail « prélèvements du mois » est ce montant moins les provisions reliées.
- **Annuler** : un transfert fait peut être remis « à faire » (ses charges repassent de `funded` à `planned`). Un virement de paie fait peut être annulé : le transfert et ses provisions sont supprimés.
- **Risque d'essai oublié** : un transfert du même jour que la fin d'essai compte dans le solde prévu. Avec les données des maquettes, Disney+ est donc signalé à risque le 20/11 (Spotify alimenté le même jour). Reporter ce transfert au 21/11 lève le risque.

### 10.14 Précisions issues du développement de l'Accueil

- **« Le marchand va retenter »** : faute de colonne dédiée, le report de trois jours est stocké dans un événement `note` dont le `payload` vaut `{ "kind": "review_again", "chargeId", "reviewAgainOn" }`. La charge est masquée de « À vérifier » jusqu'à cette date (exclue).
- **Prélèvement non financé qui a échoué comme prévu** (hors essai) : la charge passe à `failed`, sans événement.
- **Prélèvement passé sur un abonnement résilié** : l'événement est `post_cancel_charge` au lieu de `unexpected_charge`.
- **Essai passé puis gardé** : le prochain prélèvement devient la première échéance théorique à partir d'aujourd'hui, et non la date de fin d'essai.
- **Maintenance quotidienne**, lancée à l'ouverture de l'accueil (une fois par jour, rejouable) :
  - passage en `cancelled` des abonnements « à résilier » confirmés dont la période est finie (10.3) ;
  - avance de `next_charge_date` au-delà des échéances passées déjà rapprochées (`paid`, `failed`, `skipped`), sans jamais dépasser une charge passée encore ouverte.
- **Transfert correctif** après un échec dû à une hausse de prix (10.5) : pas encore proposé.

### 10.15 Précisions issues de la finition de l'app (19/11/2026)

- **Transfert correctif** (remplace la dernière ligne de 10.14) : proposé après un prélèvement passé ou retenté à un montant plus élevé que le montant financé. Il est enregistré directement comme `done` (`vault_to_main`, montant = différence), rattaché à la charge, dont le montant attendu et financé devient le nouveau montant (statut `funded`).
- **Premier lancement** : migration `003_settings_onboarding`, colonne `settings.onboarding_done` (0/1), mise à 1 d'office si des abonnements existent déjà. Tant qu'elle vaut 0, l'app affiche l'accueil en trois étapes : date de paie, marge, autorisations (notifications, alarmes exactes sur Android 12+, batterie).
- **Notifications** : planifiées sur une fenêtre glissante de 60 jours, recalculées après chaque modification et au retour au premier plan. Identifiants de référence : un par transfert prévu, `trial_end` et `cancel_end` à chaque jour de rappel puis à J+1, `payday:<date>` (tant que le virement de paie n'est pas fait), `residual:YYYY-MM` (dernier jour du mois), et un rappel `overdue:<date>` au plus une fois par jour s'il reste des transferts en retard. Les lignes `notification` de plus de 13 mois sont purgées. Une notification ouvre l'écran concerné.
- **Import** : les migrations Kysely ne sont pas transactionnelles. L'import commence donc par une copie de sécurité (export complet dans les documents de l'app), ramène le schéma à la version du fichier, remplace toutes les tables dans une transaction, puis remonte à la dernière migration. En cas d'échec, la copie de sécurité est réimportée. Un fichier issu d'une version plus récente de l'app est refusé.
- **Logos** : sous-ensemble de 95 marques Simple Icons, généré par `apps/mobile/scripts/gen-brand-icons.mjs` (écrit `src/features/subscriptions/brand-icons.ts` et `apps/enrich/brands.go`, même liste des deux côtés, chaque marque avec sa catégorie par défaut). Les marques absentes de Simple Icons (Disney+, Prime Video, Canal+, ChatGPT, Microsoft 365…) sont connues par `src/features/enrich/brand-catalog.ts` : catégorie par défaut, mais initiale à la place du logo. Couleur de marque remplacée par la couleur du texte si son contraste sur blanc est inférieur à 3.
- **Reconnaissance locale tolérante** (20/11/2026, `features/enrich/brands.ts`, pure et mémorisée) : le nom est normalisé (casse, accents, ponctuation, « + » lu « plus », suffixe de domaine, mots d'accompagnement comme « abonnement » ou « premium »), puis comparé aux titres, clés et autres appellations : égalité (confiance 1), marque en tête du nom (0,95, au moins 4 lettres), marque dans le nom (0,9, au moins 5 lettres), enfin faute de frappe (Damerau-Levenshtein : 1 erreur, 2 à partir de 8 lettres, même première lettre, jamais sous 5 lettres ; confiance = part de lettres justes). Deux marques à égalité = rien. À partir de 0,85 (`AUTO_APPLY_CONFIDENCE`) la marque est tenue pour sûre.
- **Application d'office** : à la création, une correction apprise ou une marque sûre règle la catégorie et le logo sans passer par « Appliquer », tant que l'utilisateur n'a rien choisi lui-même (un choix manuel ou une suggestion appliquée fige le classement ; un nom qui ne correspond plus à rien revient à « Autre »). La carte « Appliquer / Ignorer » reste pour la suggestion de l'IA (jamais appliquée d'office) quand elle apporte quelque chose de plus, et pour une marque seulement probable.
- **Logo à l'affichage** : un abonnement sans logo enregistré (`icon_key = 'tag'`) affiche le logo de la marque sûre reconnue dans son nom (`resolveIconKey`). Choisir « Initiale du nom » enregistre `icon_key = 'initial'`, qui bloque cette déduction.
- **Ordre des suggestions** à l'ajout : correction déjà apprise (`ai_correction`, par nom normalisé), puis `/enrich` si l'adresse et le secret sont intégrés au build et l'interrupteur des Réglages actif, puis reconnaissance locale des marques. Une correction n'est enregistrée que si l'utilisateur change la catégorie ou le logo proposés.
- **`/enrich`** : modèle `claude-haiku-5-5`, sortie structurée (JSON Schema). Le serveur Go refuse une catégorie hors liste et remet à `null` un `iconKey` hors liste, une `cancelUrl` non https ou un `trialDays` hors 0–365. Limite de 30 appels par minute et par instance. Les fixtures `contracts/fixtures/*.json` sont produites par le serveur Go (`go test ./... -update`) et relues par la validation Zod de l'app.
- **Prélèvement inconnu sans abonnement** : événement `unexpected_charge` sans abonnement, `payload` `{ "name" }` (nom saisi), avec proposition de créer l'abonnement.

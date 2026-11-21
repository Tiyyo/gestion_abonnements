# Tests de bout en bout (Maestro)

Parcours Maestro des trois flux essentiels de Sluis, sur Android.

> **Jamais sur le téléphone du quotidien.** Chaque parcours commence par `clearState` : la base SQLite de l'app ciblée est effacée.
> Le paquet de l'APK (`fr.smatou.abonnements`) est le même sur tous les appareils : seul le choix de l'appareil protège les données réelles.
> Utiliser un **émulateur** (ou un appareil de test vide) et passer son numéro de série explicitement.

## Contenu

| Fichier                                         | Parcours                                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flows/01-onboarding-add-subscriptions.yaml`    | Premier lancement (3 étapes, notifications) → ajout d'un essai et d'un abonnement actif hebdomadaire → liste, Accueil (carte d'essai), Plan (mois suivant, encart d'essai). |
| `flows/02-mark-transfer-done.yaml`              | Transfert en retard marqué fait depuis l'Accueil ; transfert coché puis remis à faire dans le Plan (l'Accueil ne propose pas d'annulation).                                 |
| `flows/03-reconcile-paid-different-amount.yaml` | Prélèvement échu rapproché « Il est passé » avec un autre montant, puis mise à jour du prix acceptée.                                                                       |
| `flows/04-report-unexpected-debit.yaml`         | Débit inattendu d'un marchand inconnu → création de l'abonnement préremplie ; second débit du même marchand rapproché du prélèvement du jour.                               |
| `subflows/launch-clean.yaml`                    | Lancement avec `clearState`, permissions accordées, lanceur du development build, attente de l'écran de démarrage.                                                          |
| `subflows/complete-onboarding.yaml`             | Premier lancement avec les valeurs par défaut (paie le 1er, marge 3 %).                                                                                                     |
| `subflows/add-subscription.yaml`                | Ajout depuis l'onglet Abonnements. Paramètres `NAME`, `AMOUNT`, `STATUS` (`trial`/`active`), `PERIODICITY`.                                                                 |
| `validate-flows.py`                             | Vérification statique, sans appareil (voir plus bas).                                                                                                                       |
| `run.sh`                                        | Lanceur avec garde-fous (émulateur, pas d'Expo Go).                                                                                                                         |

## Lancer

Prérequis : [Maestro CLI](https://docs.maestro.dev) installé (`maestro --version`), un émulateur Android démarré (`adb devices` → `emulator-5554`), Python 3 avec PyYAML.

1. Construire et installer l'app **sur l'émulateur** :
   - APK release (conseillé, aucun Metro) : `cd android && ./gradlew assembleRelease`, puis `adb -s emulator-5554 install app/build/outputs/apk/release/app-release.apk` ;
   - ou development build : `./gradlew assembleDebug`, installer `app-debug.apk`, lancer `npx expo start` et `adb -s emulator-5554 reverse tcp:8081 tcp:8081`. Après `clearState`, le lanceur `expo-dev-client` s'affiche : `launch-clean.yaml` touche le serveur `http://…:8081` listé.
   - **Pas d'Expo Go** : `clearState` sur `host.exp.exponent` effacerait Expo Go ; `run.sh` le refuse.
2. Laisser `apps/mobile/.env.local` **sans** `EXPO_PUBLIC_*` pour ce build (ou construire depuis une copie sans ce fichier) : sans configuration, la carte des soldes et la suggestion IA sont masquées, l'Accueil ne dépend d'aucun réseau.
3. Depuis `apps/mobile` :

```bash
E2E_DEVICE=emulator-5554 MAESTRO_APP_ID=fr.smatou.abonnements e2e/run.sh            # tous les parcours
E2E_DEVICE=emulator-5554 MAESTRO_APP_ID=fr.smatou.abonnements e2e/run.sh e2e/flows/02-mark-transfer-done.yaml
```

`run.sh` valide d'abord les fichiers, puis appelle `maestro --device "$E2E_DEVICE" test`. Maestro lit seul les variables `MAESTRO_*` : `appId: ${MAESTRO_APP_ID}` dans chaque fichier. Sans `run.sh` : `MAESTRO_APP_ID=… maestro --device emulator-5554 test e2e/flows`. Appareil physique de test (sans données réelles) : ajouter `E2E_ALLOW_PHYSICAL=1`.

## Vérifier sans appareil

```bash
python3 e2e/validate-flows.py
```

Contrôle que chaque YAML est bien formé (en-tête `appId: ${MAESTRO_APP_ID}` puis commandes), que chaque parcours de `flows/` commence par `launch-clean.yaml`, que chaque `runFlow` existe et que **chaque sélecteur `id:` correspond à un `testID` de `src/`** (renommer un `testID` sans mettre à jour les parcours casse cette vérification).

## Sélecteurs (`testID`)

Convention : **`ecran.element`** en kebab-case (`subscription-form.save`, `plan.transfer-check`, `tab.plan`). Un élément répété garde le même `testID` (sélection par `index`), sauf les lignes d'abonnement, repérées par le nom : `subscriptions.row-<nom>` (`testIdSlug` de `src/lib/test-id.ts` : minuscules, sans accents, tirets). Variantes d'un même contrôle : suffixe `-<clé>` (`subscription-form.status-active`, `subscription-form.periodicity-week`).

Les composants du design system acceptent et transmettent `testID` (`ActionButton`, `IconButton`, `PickerRow`, `Toggle`, `Segmented` (préfixe), `DateField`, `SheetOption`, `SheetFooter`, `SheetHeader` (`cancelTestID`), `GlassTextInput`, `GlassAmountInput`). Les onglets passent par `tabBarButtonTestID` (`TABS` dans `features/app-shell/tab-definitions.ts`). Les boutons des dialogues : `dialog.confirm` (action principale, la dernière), `dialog.cancel`, `dialog.other-<n>`. Les libellés d'accessibilité ne changent pas.

Préférer un `testID` à un texte quand le texte est sur le dégradé, change selon l'état (« Enregistrement… »), contient une apostrophe typographique ou une espace insécable, ou est transformé en majuscules (`Overline`). Dans les assertions de texte restantes, `.` remplace ’ et les espaces insécables, et on évite les dates.

## Indépendance vis-à-vis de la date

L'app lit la date du jour par `todayIn()` (fuseau Europe/Paris) ; aucune horloge de test n'est ajoutée. Les parcours ne vérifient que des noms, des montants et des libellés relatifs, et s'appuient sur des propriétés vraies quel que soit le jour :

- un abonnement **actif** prend aujourd'hui comme prochain prélèvement → son transfert (veille ouvrée) est **toujours en retard** sur l'Accueil ;
- un abonnement **hebdomadaire** a toujours plusieurs transferts **à faire** le **mois suivant** du Plan (entièrement à venir) ;
- un **essai** finit à J+30 → carte d'essai sur l'Accueil ; dans le Plan, l'encart est cherché dans le mois suivant puis le mois courant ;
- un prélèvement à vérifier exige une échéance passée : la modification (qui accepte une date passée) choisit le **1er du mois précédent** dans le calendrier natif ;
- un débit inconnu daté d'aujourd'hui (date par défaut) est rapproché du prélèvement prévu aujourd'hui (tolérance de 3 jours).

## Points à surveiller au premier passage réel

Les parcours n'ont jamais tourné sur un appareil. Les plus susceptibles d'être ajustés :

1. **Calendrier natif** (`03`) : `tapOn: 'Previous month|Mois précédent'`, `tapOn: '1'`, `tapOn: 'OK'` dépendent de la langue de l'émulateur et de l'exposition des jours du `DatePickerDialog` dans la hiérarchie d'accessibilité.
2. **Onglets** : `tabBarButtonTestID` est transmis par la barre flottante maison (`tab-press-targets.tsx`) ; vérifier que Maestro voit bien `tab.*`.
3. **`testID` sur des `YStack` Tamagui** pressables (segments, lignes, `PickerRow`) : vérifier qu'ils sortent en `resource-id` dans `maestro hierarchy`.
4. **Permission de notifications** : accordée par `launchApp permissions: all: allow` ; un repli touche « Allow|Autoriser ». L'alarme exacte et la batterie ne sont pas touchées.
5. **Écran de démarrage** (`SplashOverlay`) : délai d'attente de 30 s sur « Jour de paie ».
6. **Lanceur du development build** : textes `Development servers` et `http://…:8081` supposés.
7. **Encart d'essai du Plan** (`01`) : si J+30 tombe deux périodes de paie plus loin (fin de mois longue, jour de paie tardif), l'encart n'est ni dans le mois courant ni le suivant.
8. **Animations** (`Appear`, feuilles du bas) : Maestro attend la fin des animations, mais un `waitForAnimationToEnd` peut être nécessaire avant certains `tapOn`.

## Plus tard : CI

Un workflow GitHub `workflow_dispatch` (déclenchement manuel) pourrait construire l'APK release, démarrer un émulateur (`reactivecircus/android-emulator-runner`), installer Maestro (`curl -Ls https://get.maestro.mobile.dev | bash`) puis lancer `e2e/run.sh` avec `E2E_DEVICE=emulator-5554`. Non fourni pour l'instant.

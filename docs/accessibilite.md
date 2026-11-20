# Accessibilité de l’app mobile (audit du 20/11/2026)

Premier audit d’accessibilité de `apps/mobile/src` (`app/**`, `features/**/components/**`, `ui/**`) : TalkBack en français, police système jusqu’à 200 %, contrastes, animations réduites. L’audit est fait **sur le code source** (React Native 0.88, Tamagui 3.3.3, Reanimated 4.7.1 lus dans `node_modules`) : rien n’a encore été vérifié sur le téléphone. Les corrections certaines à la lecture du code sont faites (branche `fix/accessibility-pass`) ; le reste figure dans la liste de vérification en fin de document.

Les numéros de ligne « avant » renvoient à `main` (commit `4774517`).

## Ce que le code source permet d’affirmer

- **Focus TalkBack d’une zone pressable Tamagui.** Un `XStack`/`YStack` avec `onPress` n’est ni `accessible` ni `focusable` : Android y voit un conteneur, TalkBack lit ses textes un par un et le rôle ou le libellé posé sur le conteneur peut être ignoré. Le double tapé de TalkBack envoie `ACTION_CLICK`, que React Native ne relaie (événement `onClick` → `Pressability.onClick` → `onPress`) que si la vue est `focusable` (`ReactViewManager.setFocusable` pose le `OnClickListener`). Tamagui transforme `tabIndex={0}` en `accessible` (`getSplitStyles`, ticket 3350) et React Native transforme `tabIndex` en `focusable` (`View.js`). D’où la règle : toute zone pressable maison porte `accessible` **et** `tabIndex={0}`. Le `Button` Tamagui le fait déjà (`tabIndex: 0`), sauf désactivé (`tabIndex: -1`) : `ActionButton` force `accessible` pour qu’un bouton désactivé reste lu, avec son état.
- **`accessibilityElementsHidden` ne vaut que pour iOS.** Sous Android, il faut `importantForAccessibility="no-hide-descendants"` (avatars, dessin des onglets, voile des feuilles).
- **`accessibilityLabel` sur un conteneur non `accessible`** (ex. `GlassCard accessibilityLabel="Soldes Revolut"`) ne sert à rien et peut faire lire un nom vide de sens : retiré.
- **Feuilles et dialogues.** `BottomSheet` et `DialogHost` sont des `Modal` : Android ouvre une fenêtre à part, TalkBack y reste confiné, `onRequestClose` gère Retour (`accessibilityViewIsModal` est iOS seulement, inoffensif). Les écrans en feuille (`SheetScreen`, route `transparentModal`) : `react-native-screens` (`ScreenStack.updateA11yForVisibleScreens`, `isTranslucent()`) passe les écrans dessous en `no-hide-descendants`.
- **Animations réduites.** Reanimated lit `Settings.Global.TRANSITION_ANIMATION_SCALE` (`NativeProxy.getIsReducedMotion`, « Supprimer les animations » dans Accessibilité) ; `withTiming`, `withDelay` et toutes les animations d’entrée, de sortie et de mise en page (`BaseAnimationBuilder`, `ReduceMotion.System` par défaut) sautent alors à l’état final. Le pilote Tamagui (`@tamagui/animations-reanimated`, `transition="fast"`/`"smooth"`) appelle `withTiming` sans option : même comportement. Conséquence : l’iris de la barre d’onglets, `Appear`, `Reveal`, `Settle`, `MonthTransition`, l’interrupteur, la coche de transfert et l’écran de démarrage (qui teste en plus `useReducedMotion`) s’arrêtent net. **Aucun code ajouté** ; limite connue : seule l’échelle des transitions est lue (un réglage développeur qui ne coupe que la durée des animateurs n’est pas vu).

## Constats et corrections

Gravité : **haute** = action impossible ou information perdue au lecteur d’écran ; **moyenne** = action possible mais mal nommée, bruit ou contenu tronqué ; **basse** = confort.

| Gravité | Fichier:ligne (avant)                                                                                                                                                                        | Avant → après                                                                                                                                                                                                                                                          | État                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Haute   | `ui/surfaces/hero.tsx:8`, `theme/tamagui.config.ts:35`, `:39`                                                                                                                                | Lueur pêche à 0,30 : légendes en verre jusqu’à 3,1:1, onGlass dans un panneau 4,4:1 ; libellés d’onglet inactifs 3,6:1 sur un contenu sombre → lueur 0,14, `onGlassMuted` 72 % → 78 % de blanc, `barFill` 78 % → 88 % ; toutes les paires ≥ 4,5:1 (tableau ci-dessous) | corrigé                                          |
| Haute   | `ui/controls/picker-row.tsx:16`, `ui/feedback/sheet-option.tsx:24`, `ui/controls/segmented.tsx:35`, `ui/navigation/tab-bar/tab-press-targets.tsx:21`, `ui/surfaces/list-card.tsx:22`         | Zones pressables Tamagui sans `focusable` : double tapé TalkBack incertain, rôle et état possiblement ignorés → `accessible` + `tabIndex={0}`                                                                                                                          | corrigé, à vérifier sur appareil                 |
| Haute   | `features/plan/components/transfer-row.tsx:31`                                                                                                                                               | Corps de ligne « Reporter ou annuler » : rôle sans focus ni nom, montant lu à part → zone focusable, libellé composé (`transferAccessibilityLabel` : date, prélèvements, report, montant, fait / à faire), montant masqué en double                                    | corrigé                                          |
| Haute   | `features/subscriptions/components/subscription-list/subscription-line.tsx:12`                                                                                                               | Ligne pressable non focusable, libellé « / mois » lu « barre oblique », statut absent → `accessible` + `tabIndex`, `lineAccessibilityLabel` (périodicité en toutes lettres, catégorie, état)                                                                           | corrigé                                          |
| Haute   | `features/settings/components/expandable.tsx:23`, `subscription-list/cancelled-section.tsx:19`                                                                                               | Lignes dépliables non focusables, état `expanded` possiblement perdu ; section des résiliés sans nom (« Résiliés 3 Afficher ») → focusables, nom « Afficher les abonnements résiliés, 3 »                                                                              | corrigé                                          |
| Haute   | `features/subscriptions/components/subscription-form/logo-button.tsx:20`, `logo-options.tsx:20`, `step-button.tsx:8`                                                                         | Logo, choix de logo et boutons de marge : rôle sans focus → focusables ; logo nommé « Changer le logo, actuellement : … »                                                                                                                                              | corrigé                                          |
| Haute   | `ui/feedback/sheet-panel.tsx:28`                                                                                                                                                             | Voile « Fermer, bouton » premier élément focalisé à l’ouverture de chaque dialogue, et lu même quand le dialogue n’est pas annulable → masqué à TalkBack (fermeture par les boutons ou Retour)                                                                         | corrigé, à vérifier sur appareil (focus initial) |
| Moyenne | `ui/navigation/tab-bar/floating-tab-bar.tsx:63`, `:73`, `iris-pill.tsx:44`                                                                                                                   | Libellés d’onglet dessinés deux fois (rangée muette + capsule) en plus des zones `tab` : TalkBack lisait « Accueil » trois fois → dessin masqué (`no-hide-descendants`), seules les zones `tab` restent                                                                | corrigé                                          |
| Moyenne | `features/subscriptions/components/subscription-avatar.tsx:50`, `:60`                                                                                                                        | Avatars masqués pour iOS seulement : l’initiale était lue sous Android → `importantForAccessibility="no-hide-descendants"`                                                                                                                                             | corrigé                                          |
| Moyenne | `ui/controls/chip.tsx:19`                                                                                                                                                                    | Puces « J-1 » en rôle bouton + `selected`, lues « J tiret 1 » → `checkbox` (rappels, choix multiple) ou `radio` (délai d’alimentation), état `checked`, nom « 1 jour avant » (`daysBeforeLabel`)                                                                       | corrigé                                          |
| Moyenne | `features/settings/components/payday-grid.tsx:11`                                                                                                                                            | Jours de paie : 42 px de large dans la carte de Réglages, rôle bouton + `selected` → `hitSlop={3}` (48 × 50 sans chevauchement, la marge entre cellules est de 6 px), rôle `radio` dans un `radiogroup`                                                                | corrigé, à vérifier sur appareil                 |
| Moyenne | `ui/surfaces/key-value.tsx:7`                                                                                                                                                                | Libellé et valeur lus comme deux éléments → ligne groupée « Montant : 9,99 € » quand la valeur est du texte                                                                                                                                                            | corrigé                                          |
| Moyenne | `features/plan/components/payday-card.tsx:21`, `features/balances/components/pocket.tsx:7`, `features/stats/components/stats-summary-card.tsx:18`                                            | Lignes du virement de paie et panneaux de montant lus en deux morceaux → groupés « libellé : montant » (« indisponible » à la place de « — »)                                                                                                                          | corrigé                                          |
| Moyenne | `features/balances/components/refresh-chip.tsx:20`                                                                                                                                           | « Mis à jour Actualisation… Actualiser les soldes » → « Actualiser les soldes, mis à jour à 14:02 » / « Actualisation des soldes en cours » (`refreshAccessibilityLabel`), état `busy`, région vivante                                                                 | corrigé                                          |
| Moyenne | `features/home/components/review-list.tsx:21`, `upcoming-charge-row.tsx:13`                                                                                                                  | Carte « À vérifier » sans nom composé ; prochain prélèvement sans son financement → `reviewAccessibilityLabel`, `upcomingAccessibilityLabel` complété, sans « · »                                                                                                      | corrigé                                          |
| Moyenne | `features/home/components/next-transfer-card.tsx:24`, `overdue-transfer-card.tsx:15`, `trial-card.tsx:24`                                                                                    | Boutons « Marquer fait », « Reporter », « Garder », « Résilier » sans objet dans la liste des boutons de TalkBack → « Marquer fait le transfert de 12,40 € », « Résilier Netflix »…                                                                                    | corrigé                                          |
| Moyenne | `ui/controls/action-button.tsx:82`                                                                                                                                                           | `numberOfLines={1}` : à 200 %, « Enregistrer et planifier les rappels » tronqué → retour à la ligne, centré ; bouton désactivé gardé dans l’ordre de lecture                                                                                                           | corrigé                                          |
| Moyenne | `ui/navigation/tab-bar/tab-content.tsx:7`                                                                                                                                                    | Hauteur fixe 50 px : à 200 % l’icône et le libellé « Abonnements » débordent → `maxFontSizeMultiplier={1.2}` (dessin seulement, le nom complet est lu)                                                                                                                 | corrigé, à vérifier sur appareil                 |
| Moyenne | `ui/text/typography.tsx:60`                                                                                                                                                                  | `Display` (36 px) : à 200 %, « 1 234,56 € » ne tient plus sur une ligne de carte → `maxFontSizeMultiplier: 1.5` (54 px) pour les grands montants, `HeroAmount` compris                                                                                                 | corrigé                                          |
| Moyenne | `ui/navigation/stack-header.tsx:24`, `modal-header.tsx:11`, `sheet-header.tsx:9`, `screen-header.tsx:20`                                                                                     | Titres tronqués à une ligne → deux lignes (en-têtes de pile, de modale et de feuille), sans limite pour les titres d’écran                                                                                                                                             | corrigé                                          |
| Moyenne | `ui/controls/picker-row.tsx:31`, `subscription-line.tsx:27`, `form-hero.tsx:32`, `unknown-debit-hero.tsx:31`                                                                                 | Valeur d’un choix, nom d’abonnement et légendes coupés à une ligne → retour à la ligne (valeur), deux lignes (nom, légendes) ; les montants n’ont jamais de `numberOfLines`                                                                                            | corrigé                                          |
| Moyenne | `ui/text/typography.tsx:17`, `:24`, `ui/surfaces/section.tsx:12`, `form-group.tsx:9`, `subscription-list/group-header.tsx:6`, `services-status-card.tsx:16`, `unknown-debit-outcomes.tsx:18` | Titres non annoncés comme tels (navigation par titres impossible) → `ScreenTitle` et `Heading` en rôle `header` par défaut, titres de section et de groupe en `header` (groupe lu « En essai, 2 »)                                                                     | corrigé                                          |
| Moyenne | `features/charges/components/review-amount-field.tsx:20`                                                                                                                                     | Erreur « Montant invalide » non annoncée → région vivante (les erreurs du formulaire d’abonnement l’étaient déjà, `field-error.tsx`)                                                                                                                                   | corrigé                                          |
| Basse   | `features/plan/components/month-switcher.tsx:20`                                                                                                                                             | « Mois précédent » → « Voir le mois précédent » ; mois affiché en région vivante (annoncé au changement)                                                                                                                                                               | corrigé                                          |
| Basse   | `features/settings/components/margin-stepper.tsx:38`, `subscription-form/margin-row.tsx:37`                                                                                                  | Nouvelle marge non annoncée après « Augmenter la marge » → valeur en région vivante                                                                                                                                                                                    | corrigé                                          |
| Basse   | `features/settings/components/onboarding-progress.tsx:7`                                                                                                                                     | Changement d’étape muet (le focus reste sur « Continuer ») → bloc titre en région vivante ; barre de progression masquée sous Android                                                                                                                                  | corrigé                                          |
| Basse   | `features/home/components/home-hero.tsx:30`                                                                                                                                                  | « Statistiques » → « Ouvrir les statistiques »                                                                                                                                                                                                                         | corrigé                                          |
| Basse   | `ui/controls/date-field.tsx:17`, `picker-row.tsx:27`, `review-charge-form.tsx:31`                                                                                                            | « …. Modifier » collé au nom → nom « Date : 12/11/2026 » + indice « Ouvre le calendrier » / « Ouvre la liste des choix »                                                                                                                                               | corrigé                                          |
| Basse   | `ui/controls/glass-amount-input.tsx:23`                                                                                                                                                      | Le « € » à côté du champ, déjà nommé « en euros », était un arrêt de plus → masqué                                                                                                                                                                                     | corrigé                                          |
| Basse   | `ui/text/hero-amount.tsx:7`                                                                                                                                                                  | « — » lu « tiret » → « Montant indisponible »                                                                                                                                                                                                                          | corrigé                                          |
| Basse   | `ui/brand/splash-overlay.tsx:71`                                                                                                                                                             | Nom posé sur une vue non `accessible` → `accessible`                                                                                                                                                                                                                   | corrigé                                          |
| Basse   | `features/balances/components/balances-card.tsx:24`, `services-status-card.tsx:15`                                                                                                           | `accessibilityLabel` sur une carte non focusable → retiré                                                                                                                                                                                                              | corrigé                                          |
| Basse   | `ui/feedback/bottom-sheet.tsx:35`                                                                                                                                                            | Pas de bouton « Fermer » visible dans les listes de choix : au lecteur d’écran, on ferme par Retour ou en choisissant                                                                                                                                                  | à vérifier sur appareil                          |
| Basse   | `app/**` (`<Spinner …>`, 8 occurrences)                                                                                                                                                      | Indicateurs de chargement sans nom (`ActivityIndicator` muet sous TalkBack)                                                                                                                                                                                            | à vérifier sur appareil                          |
| Basse   | `features/subscriptions/components/subscription-form/name-input.tsx`, `amount-input.tsx`                                                                                                     | L’erreur de champ est annoncée (région vivante) mais pas rattachée au champ : en revenant sur le champ, TalkBack ne la relit pas                                                                                                                                       | à vérifier sur appareil                          |
| Info    | `ui/controls/toggle.tsx:41`                                                                                                                                                                  | `Pressable` 52 × 32 + `hitSlop` 6 = 64 × 44, rôle `switch` et état `checked` : conforme                                                                                                                                                                                | conforme                                         |
| Info    | `ui/controls/icon-button.tsx:21`, `features/plan/components/transfer-check.tsx:21`, `settings/components/margin-stepper.tsx:14`, `ui/controls/chip.tsx:7`                                    | 48 × 48, 56 × 64, 44 × 44, hauteur 44 : cibles conformes                                                                                                                                                                                                               | conforme                                         |
| Info    | Couleur seule                                                                                                                                                                                | Badges d’état (texte « Essai », « Actif »…), cartes d’alerte (texte + icône), barres de catégorie (montant et pourcentage écrits), pastilles de groupe (titre écrit), état des services (texte + icône) : le sens ne dépend jamais de la couleur seule                 | conforme                                         |

## Contrastes mesurés

Mesure : `npm run a11y:contrast` dans `apps/mobile` (`scripts/a11y-contrast.mjs`, formule WCAG 2.x, les couleurs translucides sont composées sur leur fond réel, code de sortie 1 si une paire passe sous son seuil). Le pire cas du Hero est la lueur pêche à pleine intensité sur le départ du dégradé (`heroFrom`), lue dans `ui/surfaces/hero.tsx`. Les barres d’onglets sont mesurées **sans** le flou (pire cas : flou désactivé ou contenu uniforme). Seuils : 4,5:1 pour le texte, 3:1 pour les éléments non textuels et le grand texte gras (initiales des avatars). Valeurs après correction :

| Zone            | Texte           | Fond                           | Contraste | Seuil | Résultat | Usage                                                        |
| --------------- | --------------- | ------------------------------ | --------- | ----- | -------- | ------------------------------------------------------------ |
| Clair           | `color`         | background                     | 16,47:1   | 4,5:1 | conforme | texte courant                                                |
| Clair           | `color`         | surface                        | 17,85:1   | 4,5:1 | conforme | cartes, listes                                               |
| Clair           | `color`         | subtle                         | 15,00:1   | 4,5:1 | conforme | aperçu du financement                                        |
| Clair           | `colorMuted`    | background                     | 5,41:1    | 4,5:1 | conforme | légendes, surtitres                                          |
| Clair           | `colorMuted`    | surface                        | 5,87:1    | 4,5:1 | conforme | légendes dans les cartes, texte indicatif des champs         |
| Clair           | `colorMuted`    | subtle                         | 4,93:1    | 4,5:1 | conforme | segment non choisi, badge « Résilié », bouton désactivé      |
| Clair           | `primary`       | surface                        | 13,08:1   | 4,5:1 | conforme | montant du prochain transfert, bouton fantôme                |
| Clair           | `primary`       | background                     | 12,06:1   | 4,5:1 | conforme | bouton fantôme, « Afficher »                                 |
| Clair           | `primary`       | primarySoft                    | 11,21:1   | 4,5:1 | conforme | bouton doux                                                  |
| Clair           | `onSecondary`   | secondary                      | 9,49:1    | 4,5:1 | conforme | bouton pêche, puce choisie                                   |
| Clair           | `onPrimary`     | primary                        | 13,08:1   | 4,5:1 | conforme | bouton principal, capsule d’onglet, verrou                   |
| Clair           | `onPrimary`     | warnText                       | 8,34:1    | 4,5:1 | conforme | bouton d’alerte plein                                        |
| Clair           | `onPrimary`     | dangerText                     | 9,28:1    | 4,5:1 | conforme | bouton destructif plein                                      |
| États           | `warnText`      | warnBg                         | 7,68:1    | 4,5:1 | conforme | cartes d’alerte, badge « Essai »                             |
| États           | `color`         | warnBg                         | 16,43:1   | 4,5:1 | conforme | titre et corps des cartes d’alerte                           |
| États           | `warnText`      | surface                        | 8,34:1    | 4,5:1 | conforme | « Reporté » dans une ligne de transfert                      |
| États           | `warnText`      | background                     | 7,70:1    | 4,5:1 | conforme | couverture du coffre (Plan), refus des notifications         |
| États           | `okText`        | okBg                           | 8,51:1    | 4,5:1 | conforme | carte « aucun risque », badge « Actif »                      |
| États           | `okText`        | surface                        | 9,54:1    | 4,5:1 | conforme | « Alimenté », « Virement fait »                              |
| États           | `okText`        | background                     | 8,80:1    | 4,5:1 | conforme | couverture du coffre (Plan)                                  |
| États           | `dangerText`    | dangerBg                       | 7,90:1    | 4,5:1 | conforme | transfert en retard, badge « À résilier »                    |
| États           | `dangerText`    | surface                        | 9,28:1    | 4,5:1 | conforme | bouton destructif contour                                    |
| États           | `dangerText`    | background                     | 8,56:1    | 4,5:1 | conforme | erreurs de champ                                             |
| Non textuel     | `onPrimary`     | okText                         | 9,54:1    | 3:1   | conforme | coche du transfert fait                                      |
| Non textuel     | `borderControl` | surface                        | 3,42:1    | 3:1   | conforme | bordure des champs et puces, piste d’interrupteur coupé      |
| Non textuel     | `borderControl` | background                     | 3,15:1    | 3:1   | conforme | bordure des champs sur le fond                               |
| Non textuel     | `surface`       | borderControl                  | 3,42:1    | 3:1   | conforme | pastille de l’interrupteur coupé                             |
| Non textuel     | `primary`       | subtle                         | 10,98:1   | 3:1   | conforme | barres de catégorie, progression du premier lancement        |
| Barre d’onglets | `colorMuted`    | barFill sur background         | 5,81:1    | 4,5:1 | conforme | libellé d’onglet inactif                                     |
| Barre d’onglets | `colorMuted`    | barFill sur primary            | 4,68:1    | 4,5:1 | conforme | libellé inactif, bouton principal derrière (sans flou)       |
| Barre d’onglets | `colorMuted`    | barFill sur heroTo             | 4,54:1    | 4,5:1 | conforme | libellé inactif, contenu le plus sombre derrière (sans flou) |
| Hero            | `onGlass`       | heroFrom                       | 15,59:1   | 4,5:1 | conforme | titre d’écran, en-tête de feuille                            |
| Hero            | `onGlass`       | hero + lueur pêche             | 11,04:1   | 4,5:1 | conforme | titre sous la lueur (pire cas)                               |
| Hero            | `onGlassMuted`  | heroFrom                       | 9,88:1    | 4,5:1 | conforme | surtitre, légende                                            |
| Hero            | `onGlassMuted`  | hero + lueur pêche             | 7,41:1    | 4,5:1 | conforme | surtitre sous la lueur (pire cas)                            |
| Hero            | `onGlassMuted`  | hero + lueur violette          | 8,09:1    | 4,5:1 | conforme | titre de section sur le bas du Hero                          |
| Hero            | `onGlassDanger` | hero + lueur pêche             | 7,60:1    | 4,5:1 | conforme | erreur du formulaire sur le Hero                             |
| Verre           | `onGlass`       | glassFill + lueur pêche        | 7,74:1    | 4,5:1 | conforme | montant, bouton d’icône en verre                             |
| Verre           | `onGlassMuted`  | glassFill sur heroFrom         | 7,39:1    | 4,5:1 | conforme | légende de carte en verre (cas courant)                      |
| Verre           | `onGlassMuted`  | glassFill + lueur pêche        | 5,47:1    | 4,5:1 | conforme | légende de carte en verre, texte indicatif (pire cas)        |
| Verre           | `onGlass`       | glassInner + glassFill + lueur | 6,28:1    | 4,5:1 | conforme | montant d’un panneau                                         |
| Verre           | `onGlassMuted`  | glassInner + glassFill + lueur | 4,57:1    | 4,5:1 | conforme | légende d’un panneau, état « coupé » (pire cas)              |
| Verre           | `onGlassMuted`  | glassInner + lueur pêche       | 6,07:1    | 4,5:1 | conforme | segment non choisi                                           |
| Verre           | `onGlass`       | glassFill ×2 + lueur pêche     | 5,67:1    | 4,5:1 | conforme | pastille d’actualisation                                     |
| Verre           | `onGlassOk`     | glassFill + lueur pêche        | 6,24:1    | 4,5:1 | conforme | message « le coffre couvre »                                 |
| Verre           | `onGlassOk`     | glassInner + glassFill + lueur | 5,06:1    | 4,5:1 | conforme | état d’un service                                            |
| Verre           | `onGlassWarn`   | glassFill + lueur pêche        | 5,80:1    | 4,5:1 | conforme | message d’alerte                                             |
| Verre           | `onGlassWarn`   | glassInner + glassFill + lueur | 4,71:1    | 4,5:1 | conforme | état d’un service                                            |
| Verre           | `onGlassDanger` | glassFill + lueur pêche        | 5,33:1    | 4,5:1 | conforme | accord expiré                                                |
| Désactivé       | `colorMuted`    | subtle                         | 4,93:1    | 3:1   | conforme | libellé de bouton désactivé (exempté par WCAG, indicatif)    |
| Désactivé       | `onGlassMuted`  | heroFrom                       | 9,88:1    | 3:1   | conforme | « Annuler » désactivé sur le Hero (exempté, indicatif)       |
| Marque          | blanc           | fond de l’écran de démarrage   | 13,08:1   | 4,5:1 | conforme | mot « Sluis »                                                |
| Avatar          | `#1F3B7A`       | #E6EEFB                        | 9,15:1    | 3:1   | conforme | initiale (grand texte gras, décoratif)                       |
| Avatar          | `#0F4C6E`       | #E3F2FB                        | 8,06:1    | 3:1   | conforme | initiale                                                     |
| Avatar          | `#1E5B32`       | #E5F4EA                        | 7,11:1    | 3:1   | conforme | initiale                                                     |
| Avatar          | `#0F5C55`       | #DFF2EF                        | 6,74:1    | 3:1   | conforme | initiale                                                     |
| Avatar          | `#4C1E4F`       | #EFE7FA                        | 10,89:1   | 3:1   | conforme | initiale                                                     |
| Avatar          | `#3B4650`       | #ECEEF0                        | 8,29:1    | 3:1   | conforme | initiale (et repli « ? »)                                    |

Paires sous le seuil **avant** correction (lueur 0,30, `onGlassMuted` 72 %, `barFill` 78 %) : libellé d’onglet inactif sur bouton principal 3,82:1 et sur contenu sombre 3,59:1 ; `onGlassMuted` sur carte en verre sous la lueur 3,58:1, dans un panneau 3,12:1, sur segment 3,87:1 ; `onGlass` dans un panneau 4,41:1 et sur la pastille d’actualisation 4,07:1 ; `onGlassOk` 4,20:1 / 3,55:1 ; `onGlassWarn` 3,91:1 / 3,31:1 ; `onGlassDanger` 3,58:1.

**Changements de jetons** (minimaux pour passer le pire cas) : `onGlassMuted` `rgba(255, 255, 255, 0.72)` → `0.78` ; `barFill` `rgba(255, 255, 255, 0.78)` → `0.88` (barre d’onglets un peu plus opaque) ; lueur pêche du Hero (`WARM`, `ui/surfaces/hero.tsx`) `0.30` → `0.14` (lueur plus discrète en haut à droite des en-têtes). À juger à l’œil sur le téléphone.

## Liste de vérification sur l’appareil

Réglages Android : **TalkBack** activé (langue de synthèse française) ; **Taille de police** au maximum et **Taille d’affichage** par défaut, puis les deux au maximum ; **Supprimer les animations** (Accessibilité) activé pour la dernière passe. Sur MIUI, la taille de police maximale de « Taille du texte » peut être inférieure à 200 % : utiliser « Accessibilité → Taille de police ».

Pour chaque écran, avec TalkBack : balayer de gauche à droite tout l’écran (ordre logique, aucun élément lu deux fois, aucune icône ou initiale lue seule), naviguer par titres (rotor « Titres »), activer chaque commande par double tapé.

### Barre d’onglets (tous les onglets)

- [ ] Chaque onglet est lu une seule fois : « Accueil, onglet, sélectionné, 1 sur 4 » (pas de « Accueil » répété par le dessin).
- [ ] Double tapé sur un onglet : il s’ouvre ; l’iris s’ouvre sans animation quand les animations sont supprimées.
- [ ] Police max : libellés lisibles, « Abonnements » entier, icône non rognée, la barre ne masque pas le dernier élément des listes.

### Accueil

- [ ] « jeudi 20 novembre » puis le titre « À venir » (titre) ; « Ouvrir les statistiques, bouton ».
- [ ] Carte des soldes : « Dans le coffre Revolut », montant, « Actualiser les soldes, mis à jour à … » ; double tapé : « Actualisation des soldes en cours » puis la nouvelle heure sont annoncés.
- [ ] Panneaux « Compte : … » et « À transférer : … » lus d’un bloc.
- [ ] Carte du prochain transfert : surtitre, montant, objet, puis « Marquer fait le transfert de … », « Reporter le transfert de … ». Bouton désactivé (pendant une action) lu « désactivé ».
- [ ] « À vérifier » (titre), chaque carte lue « Netflix, 13,99 €. Prévu le 18 nov, passé ou échoué ? » et ouvre le rapprochement.
- [ ] « Prochains prélèvements » (titre), « Tout voir », chaque ligne lue d’un bloc avec son financement.
- [ ] Tirer pour actualiser fonctionne (geste à trois doigts ou action TalkBack).
- [ ] Police max : grands montants sur une ligne (plafonnés à 150 %), boutons « Marquer fait » / « Reporter » sans troncature, rien ne se chevauche dans la carte en verre.

### Statistiques

- [ ] « Retour, bouton », « Statistiques » (titre), « Période » : « Mensuel, bouton radio, coché » / « Annuel ».
- [ ] Montant total, panneaux lus d’un bloc ; barres de catégorie lues « Vidéo : 25,00 €, 40 % ».
- [ ] Police max : le segmenté et les panneaux ne coupent pas leurs libellés.

### Plan

- [ ] « Plan du mois » (titre) ; « Voir le mois précédent / suivant » ; le nouveau mois est annoncé au changement.
- [ ] Virement de paie : chaque ligne lue « Prélèvements du mois (marge 3 %) : … ».
- [ ] Transfert : case « Transfert du 9 nov, Netflix, 10,30 €, case à cocher, non cochée » ; corps « Transfert du lun. 9 nov., Netflix, 10,30 €. À faire. » + indice ; double tapé ouvre le dialogue Reporter.
- [ ] Police max : montant du transfert entier, texte de la ligne qui passe à la ligne.

### Abonnements

- [ ] « En essai, 2 » (titre) ; chaque ligne « Netflix, 13,99 € par mois. Vidéo, fin d’essai 3 déc » ; l’initiale de l’avatar n’est jamais lue.
- [ ] « Afficher les abonnements résiliés, 3, bouton, réduit » → « développé » après double tapé.
- [ ] Police max : nom sur deux lignes au plus, montant jamais tronqué.

### Fiche d’un abonnement

- [ ] Nom (titre), catégorie, badge d’état lu en texte.
- [ ] Bandeau d’alerte lu ; lignes clé-valeur lues « Montant : … » d’un bloc ; « Ouvrir le lien de résiliation ».
- [ ] « Historique » (titre) ; boutons du bas lus avec leur état.
- [ ] Police max : boutons du bas sur deux lignes si besoin, sans troncature.

### Formulaire d’abonnement (Ajouter / Modifier)

- [ ] À l’ouverture, le focus est dans la feuille ; l’écran dessous n’est pas atteignable.
- [ ] « Annuler », titre (titre), « Changer le logo, actuellement : … », « Nom de l’abonnement », « Montant en euros » (le « € » n’est pas un arrêt).
- [ ] Erreur de nom ou de montant annoncée à l’enregistrement.
- [ ] « Statut » : boutons radio ; « Catégorie : Vidéo » + « Ouvre la liste des choix » ; la liste s’ouvre, le titre est lu en premier (pas « Fermer »), chaque choix « Vidéo, bouton radio, coché », Retour ferme.
- [ ] Modifier : « Diminuer la marge » annonce la nouvelle marge.
- [ ] Police max : légendes de l’aperçu sur deux lignes, bouton « Enregistrer et planifier les rappels » entier.

### Rapprochement d’un prélèvement

- [ ] Nom (titre) ; « Montant débité en euros » ; montant invalide annoncé ; « Date du débit : 12/11/2026 » + « Ouvre le calendrier ».
- [ ] « Il a échoué » / « Il est passé » lus avec leur état désactivé.

### Prélèvement non prévu

- [ ] « Nom du marchand », « Montant débité, en euros », « Date du débit : … » ; « Ce que fait Sluis » (titre).

### Réglages

- [ ] « Réglages » (titre) ; « État des services » (titre) ; chaque service lu « Rappels : activés ».
- [ ] « Virement et marge » (titre) ; « Jour de paie : le 1er du mois, bouton, réduit » ; jours « Jour 5, bouton radio, coché » ; chaque jour activable même au bord de la cellule (cible 48 × 50).
- [ ] Marge : « Augmenter la marge » annonce « 3,5 % ».
- [ ] Délai : « 1 jour avant, bouton radio » ; rappels : « 3 jours avant, case à cocher, cochée ».
- [ ] Interrupteurs « Envoyer les rappels, interrupteur, activé ».
- [ ] Police max : valeurs des lignes dépliables sur plusieurs lignes, puces lisibles.

### Premier lancement et verrouillage

- [ ] « Étape 1 sur 3 », titre ; « Continuer » : l’étape suivante est annoncée.
- [ ] Écran verrouillé : « Sluis » (titre), « Déverrouiller ».

### Dialogues (showDialog / showError)

- [ ] À l’ouverture, le titre est lu en premier ; aucun « Fermer » invisible n’est atteignable ; Retour ferme un dialogue annulable et ne ferme pas un dialogue non annulable.

### Animations supprimées

- [ ] Barre d’onglets, apparitions de cartes, dépliage des réglages, changement de mois, interrupteur, coche de transfert et écran de démarrage : aucun mouvement, état final immédiat.

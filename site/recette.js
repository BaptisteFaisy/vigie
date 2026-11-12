/**
 * La recette du cahier des charges (§25) : les 18 items, et où chacun est prouvé.
 * Affichée sur le site pour que le lecteur puisse vérifier, pas seulement croire.
 */

const fr = [
  ['Une série de niveau A qui bouge + du travail rattaché qui bouge → « vivant », avec les deux faits affichés.', 'tests/acceptance/recette.test.ts (item 1) + le registre ci-dessus'],
  ['Un objectif pointé trois fois pendant que ses tickets sont gelés depuis 30 jours → « narratif », avec S2 et S5 et leurs dates.', 'tests/acceptance/recette.test.ts (item 2) + tests/domain/signals.test.ts'],
  ['Cinq tickets rattachés le même jour par le même acteur déclenchent S1, fait visible.', 'tests/domain/signals.test.ts (S1) + tests/acceptance/recette.test.ts (item 3)'],
  ['Un RC sans source est de niveau C, et l’objectif ne peut pas dépasser « déclaré ».', 'tests/domain/degrees-state.test.ts (item 4)'],
  ['Un RC de niveau A est recalculé, et sa valeur diffère de la dernière valeur recopiée : l’écart est affiché.', 'src/domain/recompute.ts + tests/domain/recompute.test.ts + la fiche de « Réduire la latence de paiement » (55 → 37,5)'],
  ['Une projection sur trois semaines de données affiche « pas assez de recul », sans pourcentage.', 'tests/domain/projection.test.ts (item 6)'],
  ['Une projection sur huit semaines affiche un pourcentage, une fourchette et un effectif.', 'tests/domain/projection.test.ts (item 7) + tests/acceptance/recette.test.ts'],
  ['Un ticket rattaché à trois objectifs compte pour un tiers dans chacun ; le total du portefeuille ne double pas.', 'tests/domain/cost.test.ts (item 8)'],
  ['Un epic qui avance sans objectif apparaît dans le verso avec un objectif plausible et une confiance.', 'tests/domain/verso-dossier.test.ts (item 9) + le verso ci-dessus'],
  ['Le pointage pré-rempli montre les faits avant le champ d’interprétation, et les deux restent visibles ensemble.', 'tests/domain/verso-dossier.test.ts (item 10) + le pointage inversé ci-dessus'],
  ['Une interprétation « en bonne voie » avec S2 et S4 actifs affiche les deux signaux à côté, sans censure.', 'tests/actions/actions.test.ts (item 11) + le pointage inversé ci-dessus (en direct)'],
  ['Le dossier de revue contient les trois options chiffrées, et l’option « abandonner » liste le travail qui devient fantôme.', 'tests/domain/verso-dossier.test.ts (item 12) + la fiche d’objectif'],
  ['Une décision enregistrée est vérifiée à la période suivante : suivie d’effet ou non.', 'src/domain/decisions.ts + tests/domain/decisions.test.ts + la fiche (« Améliorer la satisfaction client » : abandon NON suivi d’effet)'],
  ['Un objectif mort-vivant (période close depuis 40 jours) porte une ancre et S11.', 'tests/acceptance/recette.test.ts (item 14) + l’ancre sur la carte'],
  ['Une réorganisation ouvre une époque : les séries antérieures ne sont plus mélangées aux nouvelles.', 'tests/domain/movement-epochs.test.ts (item 15) + tests/acceptance/recette.test.ts + la section Époques'],
  ['Aucun écran, export, outil MCP ni réponse d’agent ne contient de statistique par personne (test automatisé).', 'tests/actions/no-person.test.ts (les 15 outils) + tests/db/schema.test.ts (aucun GROUP BY/ORDER BY sur *_ref)'],
  ['Sans licence Goals ni droit sur le graphe, l’app bascule sur le registre local et l’écran de couverture le dit.', 'src/domain/coverage.ts + l’écran de couverture ci-dessus (source « local »)'],
  ['Un droit manquant sur le graphe apparaît à l’écran de couverture, au lieu d’un zéro silencieux.', 'tests/domain/verso-dossier.test.ts (couverture) + l’écran de couverture ci-dessus'],
];

const en = [
  ['A level-A series that moves + attached work that moves → “alive”, with both facts displayed.', 'tests/acceptance/recette.test.ts (item 1) + the register above'],
  ['An objective checked in three times while its tickets have been frozen for 30 days → “narrative”, with S2 and S5 and their dates.', 'tests/acceptance/recette.test.ts (item 2) + tests/domain/signals.test.ts'],
  ['Five tickets attached the same day by the same actor trigger S1, with a visible fact.', 'tests/domain/signals.test.ts (S1) + tests/acceptance/recette.test.ts (item 3)'],
  ['A key result without a source is level C, and the objective cannot rise above “declared”.', 'tests/domain/degrees-state.test.ts (item 4)'],
  ['A level-A key result is recomputed, and its value differs from the last copied one: the gap is displayed.', 'src/domain/recompute.ts + tests/domain/recompute.test.ts + the sheet of “Reduce payment latency” (55 → 37.5)'],
  ['A projection on three weeks of data shows “not enough data”, with no percentage.', 'tests/domain/projection.test.ts (item 6)'],
  ['A projection on eight weeks shows a percentage, a range and a sample size.', 'tests/domain/projection.test.ts (item 7) + tests/acceptance/recette.test.ts'],
  ['A ticket attached to three objectives counts a third in each; the portfolio total never doubles.', 'tests/domain/cost.test.ts (item 8)'],
  ['An epic that moves without an objective appears on the other side with a plausible objective and a confidence.', 'tests/domain/verso-dossier.test.ts (item 9) + the ghosts table above'],
  ['The pre-filled check-in shows the facts before the interpretation field, and both stay visible together.', 'tests/domain/verso-dossier.test.ts (item 10) + the reverse check-in above'],
  ['An “on track” interpretation with S2 and S4 active shows both signals beside it, without censorship.', 'tests/actions/actions.test.ts (item 11) + the reverse check-in above (live)'],
  ['The review dossier contains the three costed options, and “abandon” lists the work that becomes ghost.', 'tests/domain/verso-dossier.test.ts (item 12) + the objective sheet'],
  ['A recorded decision is verified at the next period: followed through or not.', 'src/domain/decisions.ts + tests/domain/decisions.test.ts + the sheet (“Improve customer satisfaction”: abandon NOT followed)'],
  ['A zombie objective (period closed 40 days ago) carries an anchor and S11.', 'tests/acceptance/recette.test.ts (item 14) + the anchor on the chart'],
  ['A reorganisation opens an epoch: earlier series are no longer mixed with new ones.', 'tests/domain/movement-epochs.test.ts (item 15) + tests/acceptance/recette.test.ts + the Epochs section'],
  ['No screen, export, MCP tool or agent answer contains a per-person statistic (automated test).', 'tests/actions/no-person.test.ts (all 15 tools) + tests/db/schema.test.ts (no GROUP BY/ORDER BY on *_ref)'],
  ['Without a Goals licence or graph rights, the app falls back to the local register and the coverage screen says so.', 'src/domain/coverage.ts + the coverage panel above (source “local”)'],
  ['A missing graph right appears on the coverage screen, instead of a silent zero.', 'tests/domain/verso-dossier.test.ts (coverage) + the coverage panel above'],
];

export const RECETTE = { fr, en };


/** Provenance des données et limites du mapping — affiché sur le site (§23 explicabilité). */
export const SOURCE_MAP = {
  fr: {
    github: [
      ['Objectif', 'un milestone réel du dépôt (titre, échéance).'],
      ['Résultat clé', '« part des tickets livrés » — niveau A, RECALCULÉ semaine par semaine depuis les vraies dates de clôture.'],
      ['Valeur « recopiée »', 'le compte déclaré par la plateforme, qui inclut les pull requests ; notre recalcul ne compte que les tickets → l’écart affiché est cette différence de méthode, pas une erreur.'],
      ['Rattachement', 'les tickets réellement affectés au milestone, fraction 1.'],
      ['Jours', 'durée réelle (cycle time), 3ᵉ source du §11 — la source n’a pas de temps saisi. La méthode est affichée, jamais mélangée.'],
      ['Pointage', 'AUCUN importé : cette source n’a pas de rituel de pointage. Le signal S10 « silence » est donc attendu — vous pouvez écrire un pointage en direct ci-dessous.'],
      ['Fantôme', 'un ticket actif sans milestone : du travail réel qui ne sert aucun objectif déclaré.'],
      ['Époques', '2, coupées à la médiane des dates de création.'],
      ['Vie privée (VG-21)', 'aucun auteur n’est lu ni importé, le texte des commentaires non plus : seules des dates et des comptes.'],
    ],
    synthetic: [
      ['Jeu', 'trimestre synthétique marqué comme tel (§27) : 8 objectifs couvrant les sept états, 60 epics dont 12 fantômes, un rattachement en masse, un sous-calibrage, une réorganisation.'],
      ['But', 'couvrir tous les états et tous les signaux de façon pédagogique — le dépôt réel ci-dessus ne les contient pas tous.'],
    ],
  },
  en: {
    github: [
      ['Objective', 'a real milestone of the repository (title, due date).'],
      ['Key result', '“share of tickets delivered” — level A, RECOMPUTED week by week from the real closure dates.'],
      ['“Typed” value', 'the count declared by the platform, which includes pull requests; our recompute counts issues only → the displayed gap is that method difference, not an error.'],
      ['Attachment', 'the issues really assigned to the milestone, fraction 1.'],
      ['Days', 'real duration (cycle time), the 3rd source of §11 — this source has no logged time. The method is displayed, never mixed.'],
      ['Check-in', 'NONE imported: this source has no check-in ritual. Signal S10 “silence” is therefore expected — you can write a check-in live below.'],
      ['Ghost', 'an active issue with no milestone: real work serving no declared objective.'],
      ['Epochs', '2, split at the median creation date.'],
      ['Privacy (VG-21)', 'no author is read or imported, nor comment text: only dates and counts.'],
    ],
    synthetic: [
      ['Dataset', 'a synthetic quarter marked as such (§27): 8 objectives covering all seven states, 60 epics of which 12 ghosts, a bulk attachment, an under-calibrated target, a reorganisation.'],
      ['Purpose', 'to cover every state and signal pedagogically — the real repository above does not contain all of them.'],
    ],
  },
};

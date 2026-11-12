/**
 * Vérification des décisions de revue (SPEC §13, recette §25 item 13).
 *
 * Une décision est enregistrée, puis **vérifiée à la période suivante** : suivie
 * d'effet ou non. L'app ne juge personne — elle constate si l'objectif reflète
 * la décision prise, et l'écrit. C'est ce qui transforme le registre en mémoire
 * organisationnelle (§30) : une décision non suivie d'effet remonte.
 *
 * Règle honnête et documentée par type de décision :
 *   abandon   → l'objectif est refermé ou abandonné ;
 *   continue  → l'objectif est toujours ouvert ET du travail a bougé depuis ;
 *   retarget  → l'objectif est ouvert ET une nouvelle mesure est apparue depuis
 *               (limite assumée : la cible d'origine n'est pas historisée).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ObjectiveState, ReviewDecision } from '../types';
import type { BiText } from './signals/fact-text';

export interface DecisionCheckInput {
  decision: ReviewDecision;
  objectiveState: ObjectiveState;
  /** Du travail rattaché a bougé après la date de la décision. */
  hasMovementAfter: boolean;
  /** Un nouveau point de série est apparu après la date de la décision. */
  hasPointAfter: boolean;
}

/** La décision a-t-elle été suivie d'effet ? */
export function isFollowed(input: DecisionCheckInput): boolean {
  const closed = input.objectiveState === 'closed' || input.objectiveState === 'abandoned';
  switch (input.decision.decision) {
    case 'abandon':
      return closed;
    case 'continue':
      return input.objectiveState === 'open' && input.hasMovementAfter;
    case 'retarget':
      return input.objectiveState === 'open' && input.hasPointAfter;
    default:
      return false;
  }
}

/** Le fait qui fonde la vérification, dans les deux langues (§24). */
export function followFact(input: DecisionCheckInput, followed: boolean): BiText {
  const kind = input.decision.decision;
  if (kind === 'abandon') {
    return followed
      ? { fr: 'Décision « abandonner » suivie d’effet : l’objectif est refermé.', en: 'Decision “abandon” followed: the objective is closed.' }
      : { fr: 'Décision « abandonner » non suivie d’effet : l’objectif est toujours ouvert.', en: 'Decision “abandon” not followed: the objective is still open.' };
  }
  if (kind === 'continue') {
    return followed
      ? { fr: 'Décision « continuer » suivie d’effet : du travail a bougé depuis.', en: 'Decision “continue” followed: work moved since.' }
      : { fr: 'Décision « continuer » non suivie d’effet : aucun mouvement du travail rattaché depuis.', en: 'Decision “continue” not followed: no movement on attached work since.' };
  }
  return followed
    ? { fr: 'Décision « re-cibler » suivie d’effet : une nouvelle mesure est apparue depuis.', en: 'Decision “retarget” followed: a new measurement appeared since.' }
    : { fr: 'Décision « re-cibler » non suivie d’effet : aucune nouvelle mesure depuis.', en: 'Decision “retarget” not followed: no new measurement since.' };
}

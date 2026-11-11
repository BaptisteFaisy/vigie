/**
 * Les quatre degrés (SPEC §6) — domaine PUR.
 *
 * Un objectif « avance » veut dire quatre choses différentes. L'app les sépare
 * et affiche toujours le degré atteint AVEC son fondement :
 *   déclaré    → quelqu'un a écrit « en bonne voie » ;
 *   travaillé  → du travail rattaché a bougé ;
 *   avancé     → la série du RC a bougé dans le sens attendu, depuis A ou B ;
 *   concordant → avancé ET le travail précède le nombre, dans le même périmètre.
 *
 * Le quatrième degré n'est PAS une preuve de causalité : « concordant » signifie
 * que rien, dans ce qu'on observe, ne contredit l'attribution. Un RC de niveau C
 * ne permet jamais d'atteindre « avancé » (§8, recette §25 item 4).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { Concordance, Degree, DegreeBasis, SourceLevel } from '../types.js';
import { DEGREE_ORDER } from '../defaults.js';

export interface DegreeInput {
  hasCheckin: boolean;
  workMoved: boolean;
  seriesAdvanced: boolean;
  bestSeriesLevel: SourceLevel | 'none';
  concordance: Concordance | null;
}

/** Rang d'un degré dans l'échelle (declare=0 … concordant=3). */
export function degreeRank(degree: Degree): number {
  const index = DEGREE_ORDER.indexOf(degree);
  return index === -1 ? 0 : index;
}

/** Le meilleur de deux degrés. */
export function maxDegree(a: Degree, b: Degree): Degree {
  return degreeRank(a) >= degreeRank(b) ? a : b;
}

function canAdvance(level: SourceLevel | 'none'): boolean {
  return level === 'A' || level === 'B';
}

/**
 * Détermine le degré atteint et les faits qui le fondent (§6). Renvoie toujours
 * un `DegreeBasis` lisible, sans aucune donnée de personne (VG-21).
 */
export function computeDegree(input: DegreeInput): DegreeBasis {
  const facts: string[] = [];
  const advanced = input.seriesAdvanced && canAdvance(input.bestSeriesLevel);
  const concordant = advanced && input.concordance?.degree === 'concordant';
  let degree: Degree = 'declare';

  if (input.hasCheckin) facts.push('Un pointage a été enregistré (degré « déclaré »).');
  else facts.push('Aucun pointage : rien n’est déclaré.');

  if (input.workMoved) {
    degree = maxDegree(degree, 'travaille');
    facts.push('Du travail rattaché a bougé : transitions, commits ou fermetures (degré « travaillé »).');
  } else {
    facts.push('Aucun mouvement du travail rattaché.');
  }

  if (advanced) {
    degree = maxDegree(degree, 'avance');
    facts.push(`La série a bougé dans le sens attendu depuis une source de niveau ${input.bestSeriesLevel} (degré « avancé »).`);
  } else if (input.seriesAdvanced) {
    facts.push('La série a bougé, mais depuis une source de niveau C : le degré « avancé » n’est pas atteint.');
  } else {
    facts.push('La série n’a pas bougé dans le sens attendu.');
  }

  if (concordant) {
    degree = 'concordant';
    facts.push('Le mouvement du travail précède celui du nombre dans le même périmètre (degré « concordant » — pas une causalité).');
  }

  return { degree, facts };
}

/**
 * Pointage inversé (SPEC §12) — domaine PUR.
 *
 * Le pointage habituel commence par une couleur choisie à l'intuition. Ici
 * l'ordre est inversé : l'app PRÉ-REMPLIT les faits (mouvement de la semaine,
 * points de série, état, signaux actifs, projection, coût), la personne lit puis
 * écrit son interprétation, et les deux sont affichés côte à côte. Si
 * l'interprétation contredit les faits, l'app ne censure rien : elle affiche les
 * faits à côté. Ce module assemble les faits ; il ne juge jamais l'interprétation.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type {
  CheckinFacts, Degree, KrPoint, Movement, ProjectionConclusion, SignalId, TheatreState,
} from '../types.js';

export interface CheckinFactsInput {
  degree: Degree;
  theatreState: TheatreState | null;
  activeSignals: readonly SignalId[];
  weekMovement: Movement | null;
  newPoints: readonly KrPoint[];
  projectionPct: number | null;
  projectionConclusion: ProjectionConclusion | null;
  costDays: number | null;
}

/**
 * Assemble les faits pré-remplis d'un pointage (§12). Les faits sont figés au
 * moment du pointage : ils resteront affichés à côté de l'interprétation.
 */
export function buildCheckinFacts(input: CheckinFactsInput): CheckinFacts {
  return {
    degree: input.degree,
    theatreState: input.theatreState,
    activeSignals: [...input.activeSignals],
    weekMovement: input.weekMovement,
    newPoints: [...input.newPoints],
    projectionPct: input.projectionPct,
    projectionConclusion: input.projectionConclusion,
    costDays: input.costDays,
  };
}

/**
 * Vrai quand l'interprétation contredit les faits (§12) : par exemple « en bonne
 * voie » alors que le travail est gelé (S2) et la série plate (S4). L'app ne
 * censure pas — elle affiche l'écart. Aucune jugement de la prose (§5).
 */
export function interpretationContradictsFacts(interpretation: string, facts: CheckinFacts): boolean {
  const positive = /(bonne voie|on track|en avance|bien|under control|maîtris)/i.test(interpretation);
  const blocked = facts.activeSignals.includes('S2') || facts.activeSignals.includes('S4');
  return positive && (blocked || facts.degree === 'declare');
}

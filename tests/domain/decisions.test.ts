/**
 * Vérification des décisions de revue (SPEC §13, recette §25 item 13).
 * Une décision est enregistrée, puis vérifiée à la période suivante : suivie
 * d'effet ou non. L'app constate, elle ne juge personne.
 */
import { describe, it, expect } from 'vitest';
import { isFollowed, followFact } from '../../src/domain/decisions.js';
import { makeDecision } from '../helpers/factories.js';

const base = { hasMovementAfter: false, hasPointAfter: false };

describe('isFollowed (§13)', () => {
  it('abandonner → suivi d’effet si l’objectif est refermé ou abandonné', () => {
    const decision = makeDecision({ decision: 'abandon' });
    expect(isFollowed({ decision, objectiveState: 'abandoned', ...base })).toBe(true);
    expect(isFollowed({ decision, objectiveState: 'closed', ...base })).toBe(true);
    expect(isFollowed({ decision, objectiveState: 'open', ...base })).toBe(false);
  });

  it('continuer → suivi d’effet si l’objectif est ouvert ET que du travail a bougé depuis', () => {
    const decision = makeDecision({ decision: 'continue' });
    expect(isFollowed({ decision, objectiveState: 'open', hasMovementAfter: true, hasPointAfter: false })).toBe(true);
    expect(isFollowed({ decision, objectiveState: 'open', ...base })).toBe(false);
    expect(isFollowed({ decision, objectiveState: 'abandoned', hasMovementAfter: true, hasPointAfter: false })).toBe(false);
  });

  it('re-cibler → suivi d’effet si une nouvelle mesure est apparue depuis', () => {
    const decision = makeDecision({ decision: 'retarget' });
    expect(isFollowed({ decision, objectiveState: 'open', hasMovementAfter: false, hasPointAfter: true })).toBe(true);
    expect(isFollowed({ decision, objectiveState: 'open', ...base })).toBe(false);
  });
});

describe('followFact — le fait bilingue (§24)', () => {
  it('nomme l’écart en français et en anglais, sans jamais nommer quelqu’un', () => {
    const decision = makeDecision({ decision: 'abandon' });
    const notFollowed = followFact({ decision, objectiveState: 'open', ...base }, false);
    expect(notFollowed.fr).toMatch(/non suivie/i);
    expect(notFollowed.en).toMatch(/not followed/i);
    expect(notFollowed.fr).not.toBe(notFollowed.en);

    const followed = followFact({ decision, objectiveState: 'abandoned', ...base }, true);
    expect(followed.fr).toMatch(/suivie d’effet/i);
    expect(followed.en).toMatch(/followed/i);
  });

  it('chaque type de décision a son fait', () => {
    for (const kind of ['continue', 'retarget', 'abandon'] as const) {
      const fact = followFact({ decision: makeDecision({ decision: kind }), objectiveState: 'open', ...base }, false);
      expect(fact.fr.length).toBeGreaterThan(10);
      expect(fact.en.length).toBeGreaterThan(10);
    }
  });
});

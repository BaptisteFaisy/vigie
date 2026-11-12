/**
 * Verso, dossier, couverture, pointage, post-mortem — recette §25 items 9, 10, 12.
 */
import { describe, it, expect } from 'vitest';
import { detectOrphans, ghostSharePct } from '../../src/domain/orphans';
import { buildDossier } from '../../src/domain/dossier';
import { computeCoverage } from '../../src/domain/coverage';
import { buildCheckinFacts, interpretationContradictsFacts } from '../../src/domain/checkin';
import { buildPostmortem } from '../../src/domain/postmortem';
import { makeObjective, makeLink, makeCost, makeKeyResult } from '../helpers/factories';

const NOW = '2026-11-11T12:00:00.000Z';

describe('verso — les fantômes (§7, VG-12)', () => {
  const candidates = [
    { issueId: '1', issueKey: 'PAY-1', projectKey: 'PAY', daysSpent: 5, moved: true },
    { issueId: '2', issueKey: 'PAY-2', projectKey: 'PAY', daysSpent: 8, moved: true }, // rattaché
    { issueId: '3', issueKey: 'OPS-3', projectKey: 'OPS', daysSpent: 2, moved: true },
    { issueId: '4', issueKey: 'PAY-4', projectKey: 'PAY', daysSpent: 1, moved: false }, // ne bouge pas
  ];
  const activeLinks = [makeLink({ issueId: '2', issueKey: 'PAY-2' })];

  it('item 9 — un epic qui avance sans objectif apparaît au verso, trié par jours', () => {
    const ghosts = detectOrphans({ candidates, activeLinks, now: NOW });
    expect(ghosts.map((g) => g.issueKey)).toEqual(['PAY-1', 'OPS-3']); // PAY-2 rattaché, PAY-4 ne bouge pas
    expect(ghosts[0].daysSpent).toBeGreaterThanOrEqual(ghosts[1].daysSpent);
  });

  it('item 9 — objectif plausible proposé avec confiance au-dessus du seuil', () => {
    const ghosts = detectOrphans({
      candidates, activeLinks, now: NOW,
      suggestions: [{ issueKey: 'PAY-1', objectiveId: 'obj_1', confidence: 0.72, reason: 'Composant payments, titre proche.' }],
    });
    const pay1 = ghosts.find((g) => g.issueKey === 'PAY-1');
    expect(pay1?.suggestedObjectiveId).toBe('obj_1');
    expect(pay1?.confidence).toBeCloseTo(0.72, 5);
  });

  it('sous le seuil de confiance → « pas assez de recul », pas de devinette', () => {
    const ghosts = detectOrphans({
      candidates, activeLinks, now: NOW,
      suggestions: [{ issueKey: 'OPS-3', objectiveId: 'obj_9', confidence: 0.1, reason: 'trop faible' }],
    });
    const ops3 = ghosts.find((g) => g.issueKey === 'OPS-3');
    expect(ops3?.suggestedObjectiveId).toBeNull();
    expect(ops3?.reason).toMatch(/pas assez de recul/i);
  });

  it('part fantôme en pourcentage', () => {
    expect(ghostSharePct(18, 100)).toBe(18);
    expect(ghostSharePct(5, 0)).toBe(0);
  });
});

describe('dossier de revue (§13)', () => {
  const links = [makeLink({ issueId: '1', issueKey: 'PAY-1' }), makeLink({ issueId: '2', issueKey: 'PAY-2' })];
  const dossier = buildDossier({
    objective: makeObjective(), keyResults: [makeKeyResult()], degree: 'travaille', theatreState: 'narratif',
    signals: [], series: [], projection: null, cost: makeCost({ days: 41 }), movement: [], otherChanges: [],
    links, decision: null,
  });

  it('item 12 — trois options chiffrées', () => {
    expect(dossier.options.map((o) => o.kind)).toEqual(['continue', 'retarget', 'abandon']);
    expect(dossier.options[0].costDays).toBe(41);
  });

  it('item 12 — l’option « abandonner » liste le travail qui devient fantôme', () => {
    const abandon = dossier.options.find((o) => o.kind === 'abandon');
    expect(abandon?.orphanedIssueKeys).toEqual(['PAY-1', 'PAY-2']);
  });
});

describe('couverture (§19, VG-19)', () => {
  it('source active, droits manquants et pourcentages', () => {
    const cov = computeCoverage({
      scope: 'cloud_1', sourceActive: 'local',
      graphAvailability: { available: false, missingRights: ['read:graph:work-item'] },
      totalIssues: 100, linkedIssues: 82, totalKrs: 7, levelAKrs: 4, now: NOW,
    });
    expect(cov.sourceActive).toBe('local');
    expect(cov.rightsMissing).toEqual(['read:graph:work-item']);
    expect(cov.workLinkedPct).toBe(82);
    expect(cov.krLevelAPct).toBeCloseTo(57.1, 1);
  });

  it('graphe disponible → aucun droit manquant', () => {
    const cov = computeCoverage({
      scope: 'c', sourceActive: 'graph', graphAvailability: { available: true, missingRights: [] },
      totalIssues: 0, linkedIssues: 0, totalKrs: 0, levelAKrs: 0, now: NOW,
    });
    expect(cov.rightsMissing).toEqual([]);
    expect(cov.workLinkedPct).toBe(0); // division par 0 → 0, pas d'exception
  });
});

describe('pointage inversé (§12) et post-mortem (§15)', () => {
  it('item 10 — les faits sont pré-remplis avant l’interprétation', () => {
    const facts = buildCheckinFacts({
      degree: 'declare', theatreState: 'narratif', activeSignals: ['S2', 'S4'], weekMovement: null,
      newPoints: [], projectionPct: null, projectionConclusion: 'pas-assez-de-recul', costDays: 10,
    });
    expect(facts.activeSignals).toEqual(['S2', 'S4']);
    expect(facts.degree).toBe('declare');
  });

  it('« en bonne voie » avec S2 et S4 actifs → écart signalé, sans censure', () => {
    const facts = buildCheckinFacts({
      degree: 'declare', theatreState: 'narratif', activeSignals: ['S2', 'S4'], weekMovement: null,
      newPoints: [], projectionPct: null, projectionConclusion: null, costDays: null,
    });
    expect(interpretationContradictsFacts('En bonne voie', facts)).toBe(true);
  });

  it('post-mortem : même structure pour réussi et abandonné', () => {
    const pm = buildPostmortem({
      objective: makeObjective(), baseline: 900, finalValue: 500, finalLevel: 'A', direction: 'down',
      links: [], landedIssueKeys: ['PAY-1'], cost: makeCost(), signalsFired: ['S8'], decision: null, now: NOW,
    });
    expect(pm.moved).toBe(true);
    expect(pm.landed).toBe(true);
    expect(pm.learned.length).toBeGreaterThan(0);
  });
});

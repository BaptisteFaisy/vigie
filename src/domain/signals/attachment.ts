/**
 * Signaux de rattachement (SPEC §7) : S0, S1, S7, S12 — domaine PUR.
 *
 *   S0  Aucun rattachement        · 0 ticket lié
 *   S1  Rattachement en masse     · ≥ seuil tickets liés le même jour par le même acteur
 *   S7  Rattachement hors périmètre · projets/composants liés sans rapport avec le périmètre
 *   S12 Double comptage           · même ticket sur ≥ seuil objectifs sans fraction déclarée
 *
 * VG-21 : S1 regroupe par acteur EN INTERNE (linkedByRef) mais le fait n'affiche
 * que la date et le compte — jamais l'identité, dans aucune des deux langues.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ObjectiveLink, SignalFact } from '../../types.js';
import type { SignalInput } from './index.js';
import { factNoAttachment, factBulkAttach, factOutOfScope, factDoubleCount } from './fact-text.js';

/** Projet d'une clé de ticket (`PAY-12` → `PAY`). */
export function projectOfKey(issueKey: string): string {
  const dash = issueKey.indexOf('-');
  return dash === -1 ? issueKey : issueKey.slice(0, dash);
}

function attached(input: SignalInput): readonly ObjectiveLink[] {
  return input.links.filter((l) => l.state !== 'detached');
}

function s0(input: SignalInput): SignalFact[] {
  if (attached(input).length > 0) return [];
  const t = factNoAttachment();
  return [{ signal: 'S0', value: 0, threshold: input.thresholds.S0, at: input.now, detail: t.fr, detailEn: t.en }];
}

function s1(input: SignalInput): SignalFact[] {
  const threshold = input.thresholds.S1;
  const groups = new Map<string, { day: string; count: number }>();
  for (const link of attached(input)) {
    const day = link.linkedAt.slice(0, 10);
    const key = `${link.linkedByRef ?? 'inconnu'}|${day}`;
    const group = groups.get(key) ?? { day, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  const facts: SignalFact[] = [];
  for (const group of groups.values()) {
    if (group.count < threshold) continue;
    const t = factBulkAttach(group.count, group.day);
    facts.push({ signal: 'S1', value: group.count, threshold, at: `${group.day}T00:00:00.000Z`, detail: t.fr, detailEn: t.en });
  }
  return facts;
}

function isOutOfScope(input: SignalInput, link: ObjectiveLink): boolean {
  const project = projectOfKey(link.issueKey);
  if (input.scope.projectKeys.length > 0 && !input.scope.projectKeys.includes(project)) return true;
  const components = input.issueComponents?.[link.issueId] ?? [];
  if (input.scope.components.length > 0 && components.length > 0) {
    return !components.some((c) => input.scope.components.includes(c));
  }
  return false;
}

function s7(input: SignalInput): SignalFact[] {
  const threshold = input.thresholds.S7;
  const out = attached(input).filter((l) => isOutOfScope(input, l));
  if (out.length <= threshold) return [];
  const projects = [...new Set(out.map((l) => projectOfKey(l.issueKey)))].join(', ');
  const t = factOutOfScope(out.length, projects);
  return [{ signal: 'S7', value: out.length, threshold, at: input.now, detail: t.fr, detailEn: t.en }];
}

function s12(input: SignalInput): SignalFact[] {
  const threshold = input.thresholds.S12;
  const perIssue = input.objectivesPerIssue ?? {};
  const facts: SignalFact[] = [];
  for (const link of attached(input)) {
    const shared = perIssue[link.issueId] ?? 1;
    if (shared < threshold || link.fraction < 1) continue;
    const t = factDoubleCount(link.issueKey, shared);
    facts.push({ signal: 'S12', value: shared, threshold, at: link.linkedAt, detail: t.fr, detailEn: t.en });
  }
  return facts;
}

/** Tous les signaux de rattachement (S0, S1, S7, S12). */
export function detectAttachmentSignals(input: SignalInput): SignalFact[] {
  return [...s0(input), ...s1(input), ...s7(input), ...s12(input)];
}

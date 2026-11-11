/**
 * LLM hébergé (SPEC §20) — borné à deux usages : rattachements candidats et
 * synthèse de dossier. JAMAIS pour juger un pointage (§5, §20). Cache simple par
 * empreinte pour la sobriété (§23) ; sortie bornée et validée (une proposition
 * n'est jamais une devinette affirmée : elle reste à confirmer par un humain).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { LlmGateway, SuggestedLink } from '../ports.js';
import type { ObjectiveView } from '../types.js';
import { loadLlm } from './forge-runtime.js';

export interface LlmDeps {
  generate?: (prompt: string) => Promise<string>;
  maxCandidates?: number;
}

function defaultGenerate(): (prompt: string) => Promise<string> {
  return async (prompt) => {
    const llm = await loadLlm();
    if (typeof llm.generateText !== 'function') return '';
    return llm.generateText(prompt, { maxTokens: 800 });
  };
}

function fingerprint(parts: readonly unknown[]): string {
  return JSON.stringify(parts).slice(0, 4000);
}

/** Extrait un tableau JSON d'une réponse de modèle (tolérant aux fenced blocks). */
function parseJsonArray(raw: string): Record<string, unknown>[] {
  const match = /\[[\s\S]*\]/.exec(raw);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null) : [];
  } catch {
    return [];
  }
}

/** Crée l'adaptateur LLM (candidats + synthèse uniquement). */
export function createLlmGateway(deps: LlmDeps = {}): LlmGateway {
  const generate = deps.generate ?? defaultGenerate();
  const cache = new Map<string, SuggestedLink[]>();

  return {
    async suggestLinks(objectiveTitle, scopeKeywords, candidates) {
      const key = fingerprint([objectiveTitle, scopeKeywords, candidates.map((c) => c.key)]);
      const cached = cache.get(key);
      if (cached) return cached;
      const prompt = [
        'Propose quels tickets servent cet objectif. Réponds UNIQUEMENT en JSON:',
        '[{"key":"PAY-1","confidence":0.0-1.0,"rationale":"une phrase"}].',
        `Objectif: ${objectiveTitle}. Périmètre: ${scopeKeywords.join(', ')}.`,
        `Tickets candidats: ${candidates.map((c) => `${c.key} (${c.summary}; ${c.components.join('/')})`).join(' | ')}`,
      ].join('\n');
      const parsed = parseJsonArray(await generate(prompt));
      const limit = deps.maxCandidates ?? 10;
      const result: SuggestedLink[] = parsed
        .filter((p) => typeof p.key === 'string')
        .slice(0, limit)
        .map((p) => ({
          issueKey: String(p.key),
          confidence: typeof p.confidence === 'number' ? Math.max(0, Math.min(1, p.confidence)) : 0,
          rationale: typeof p.rationale === 'string' ? p.rationale : '',
        }));
      cache.set(key, result);
      return result;
    },

    async synthesizeDossier(view: ObjectiveView) {
      const facts = [
        `Objectif: ${view.objective.title}. État: ${view.theatreState ?? 'n/a'}. Degré: ${view.degree}.`,
        `Signaux: ${view.signals.map((s) => s.signal).join(', ') || 'aucun'}.`,
        `Projection: ${view.projection ? `${view.projection.pct ?? 'n/a'}% (${view.projection.conclusion})` : 'pas assez de recul'}.`,
        `Coût: ${view.cost ? `${view.cost.days} j (${view.cost.method})` : 'n/a'}.`,
      ].join('\n');
      const prompt = `Rédige une synthèse FACTUELLE de revue (5 phrases, sans juger personne, sans inventer de causalité):\n${facts}`;
      return generate(prompt);
    },
  };
}

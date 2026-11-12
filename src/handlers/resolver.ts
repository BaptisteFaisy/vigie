/**
 * Resolver des modules UI : une fonction par écran, invoquée par le frontend via
 * `@forge/bridge` `invoke(...)`. Le frontend route sur `context.moduleKey`
 * (SPEC §19) ; chaque module ne demande QUE les données de son écran.
 *
 * L'encart ticket lit depuis le cache (pas de recalcul) pour tenir < 2 s (§23).
 * Les données viennent des moteurs (point de calcul unique) et de
 * `src/viewmodel/ui.ts` (pur). VG-21 : aucune personne dans les sorties.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { AppDeps } from '../ports';
import type { Lang } from '../i18n/index';
import { DEFAULT_PERIOD } from '../defaults';

import { registerRows, coverageView, orphanRow, portfolioHead } from '../viewmodel/ui';
import { buildDossier } from '../domain/dossier';

/** Forme structurelle de `@forge/resolver` (testable sans runtime). */
export interface ResolverLike {
  define(key: string, fn: (request: unknown) => Promise<unknown>): void;
}

interface ResolverRequest {
  payload?: { language?: string; periodId?: string; issueId?: string; projectKey?: string; objectiveId?: string; krId?: string; signal?: string; threshold?: number };
  context?: { cloudId?: string; platform?: { issue?: { id?: string; key?: string }; project?: { key?: string } } };
}

function langOf(request: ResolverRequest): Lang {
  return request.payload?.language?.startsWith('fr') ? 'fr' : 'en';
}

function periodOf(request: ResolverRequest): string {
  return typeof request.payload?.periodId === 'string' ? request.payload.periodId : DEFAULT_PERIOD.id;
}

/** Issue courante : payload explicite, sinon le contexte de plateforme Forge. */
function issueIdOf(request: ResolverRequest): string | null {
  return request.payload?.issueId ?? request.context?.platform?.issue?.id ?? null;
}

function projectKeyOf(request: ResolverRequest): string | null {
  return request.payload?.projectKey ?? request.context?.platform?.project?.key ?? null;
}

/** Enregistre les fonctions du resolver (appelées par `invoke`). */
export function registerResolvers(resolver: ResolverLike, deps: AppDeps): void {
  // Le schéma est appliqué avant la première lecture : Forge SQL ne crée
  // aucune table tout seul (§21).
  const define = (key: string, fn: (request: unknown) => Promise<unknown>): void => {
    resolver.define(key, async (request) => {
      await deps.schema.ensure();
      return fn(request);
    });
  };

  define('get-register', async (request) => {
    const req = request as ResolverRequest;
    const brief = await deps.portfolioEngine.brief(periodOf(req));
    return { rows: registerRows(brief.objectives, langOf(req)), head: portfolioHead(brief, langOf(req)), byState: brief.byState };
  });

  define('get-coverage', async (request) => {
    const req = request as ResolverRequest;
    const coverage = await deps.store.getCoverage(req.context?.cloudId ?? '');
    return coverageView(coverage, langOf(req));
  });

  define('get-verso', async () => {
    const orphans = await deps.store.listOrphans({});
    return orphans.map((o) => orphanRow(o));
  });

  /** Encart sur le ticket (§19, VG-15) : quel objectif sert ce ticket ? */
  define('get-feature', async (request) => {
    const req = request as ResolverRequest;
    const issueId = issueIdOf(req);
    if (!issueId) return { links: [], orphan: false };
    const links = await deps.store.listLinksByIssue(issueId);
    const active = links.filter((l) => l.state !== 'detached');
    const enriched = [];
    for (const link of active) {
      const objective = await deps.store.getObjective(link.objectiveId);
      enriched.push({ objectiveId: link.objectiveId, objectiveTitle: objective?.title ?? link.objectiveId, fraction: link.fraction, state: link.state, reason: link.reason });
    }
    const orphans = await deps.store.listOrphans({});
    const orphan = active.length === 0 && orphans.some((o) => o.issueId === issueId);
    return { links: enriched, orphan };
  });

  /** Gadget de tableau de bord (§19) : compteur de théâtre de la période. */
  define('get-gadget', async (request) => {
    const req = request as ResolverRequest;
    return deps.portfolioEngine.theatreCount(periodOf(req));
  });

  /** Page projet (§19) : part du travail rattachée + fantômes du projet. */
  define('get-project', async (request) => {
    const req = request as ResolverRequest;
    const projectKey = projectKeyOf(req);
    const links = await deps.store.listActiveLinksByPeriod(periodOf(req));
    const linked = projectKey ? links.filter((l) => l.issueKey.startsWith(`${projectKey}-`)) : links;
    const ghosts = await deps.store.listOrphans({ projectKey: projectKey ?? undefined });
    const total = linked.length + ghosts.length;
    return {
      projectKey,
      linkedIssues: new Set(linked.map((l) => l.issueId)).size,
      ghostCount: ghosts.length,
      linkedPct: total === 0 ? 0 : Math.round((linked.length / total) * 1000) / 10,
      ghosts: ghosts.map((o) => orphanRow(o)),
    };
  });

  /** Réglages (§19) : seuils, période, époques, source, attribution. */
  define('get-settings', async (request) => {
    const req = request as ResolverRequest;
    const settings = await deps.store.getSettings(req.context?.cloudId ?? '');
    const epochs = await deps.store.listEpochs();
    return { settings, epochs };
  });

  /** Mise à jour d'un seuil de signal (§7 : seuils réglables). */
  define('save-settings-threshold', async (request) => {
    const req = request as ResolverRequest;
    const scope = req.context?.cloudId ?? '';
    const settings = await deps.store.getSettings(scope);
    if (!settings || !req.payload?.signal || typeof req.payload.threshold !== 'number') return { ok: false };
    const thresholds = { ...settings.thresholds, [req.payload.signal]: req.payload.threshold };
    await deps.store.saveSettings({ ...settings, thresholds });
    return { ok: true, thresholds };
  });

  /** Dossier de revue (macro Confluence, §13). */
  define('get-dossier', async (request) => {
    const req = request as ResolverRequest;
    const objectiveId = req.payload?.objectiveId ?? null;
    if (!objectiveId) return null;
    const view = await deps.theatre.qualify(objectiveId);
    if (!view) return null;
    const decision = await deps.store.latestDecisionForObjective(objectiveId);
    const record = await deps.store.getDossierRecord(objectiveId);
    return buildDossier({
      objective: view.objective, keyResults: view.keyResults, degree: view.degree, theatreState: view.theatreState,
      signals: view.signals, series: view.series, projection: view.projection, cost: view.cost,
      movement: view.movement, otherChanges: view.concordance?.otherChanges ?? [], links: view.links,
      decision, pageAri: record?.pageAri ?? null,
    });
  });

  /** Série d'un RC (macro Confluence, §19). */
  define('get-kr-series-view', async (request) => {
    const req = request as ResolverRequest;
    const krId = req.payload?.krId ?? null;
    if (!krId) return [];
    return deps.store.listPointsByKr(krId);
  });
}

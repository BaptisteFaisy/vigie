/**
 * Store enregistreur : enveloppe un `VigieStore` et garde la dernière version de
 * chaque entité écrite. Sert à exporter les DONNÉES RÉELLES importées sous forme
 * hydratable par le moteur navigateur (`site/data/real-store.json`) — sans
 * toucher au code d'import.
 *
 * Les entités DÉRIVÉES (signaux, projections, coûts, concordances, couverture) ne
 * sont pas enregistrées : le moteur les recalcule à l'identique au chargement.
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { VigieStore } from '../src/ports';
import type { Checkin, Epoch, KeyResult, KrPoint, Movement, Objective, ObjectiveLink, Orphan, Settings } from '../src/types';

export interface StoreDump {
  objectives: Objective[];
  keyResults: KeyResult[];
  points: KrPoint[];
  links: ObjectiveLink[];
  movements: Movement[];
  checkins: Checkin[];
  orphans: Orphan[];
  epochs: Epoch[];
  settings: Settings[];
}

function recorder<K, V>(keyOf: (v: V) => K) {
  const map = new Map<K, V>();
  return { map, put: (v: V) => map.set(keyOf(v), v), values: () => [...map.values()] };
}

/** Enveloppe un store et expose le `dump` des entités écrites. */
export function recordingStore(inner: VigieStore): { store: VigieStore; dump: () => StoreDump } {
  const objectives = recorder<string, Objective>((o) => o.id);
  const keyResults = recorder<string, KeyResult>((k) => k.id);
  const points = recorder<string, KrPoint>((p) => p.id);
  const links = recorder<string, ObjectiveLink>((l) => l.id);
  const movements = recorder<string, Movement>((m) => `${m.issueId}|${m.week}`);
  const checkins = recorder<string, Checkin>((c) => c.id);
  const orphans = recorder<string, Orphan>((o) => o.issueId);
  const epochs = recorder<string, Epoch>((e) => e.id);
  const settings = recorder<string, Settings>((s) => s.scope);

  const store: VigieStore = new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        const result = await (value as (...a: unknown[]) => Promise<unknown>)(...args);
        record(String(prop), args[0]);
        return result;
      };
    },
  });

  function record(method: string, entity: unknown): void {
    if (!entity || typeof entity !== 'object') return;
    if (method === 'saveObjective') objectives.put(entity as Objective);
    else if (method === 'saveKeyResult') keyResults.put(entity as KeyResult);
    else if (method === 'savePoint') points.put(entity as KrPoint);
    else if (method === 'saveLink') links.put(entity as ObjectiveLink);
    else if (method === 'saveMovement') movements.put(entity as Movement);
    else if (method === 'saveCheckin') checkins.put(entity as Checkin);
    else if (method === 'saveOrphan') orphans.put(entity as Orphan);
    else if (method === 'saveEpoch') epochs.put(entity as Epoch);
    else if (method === 'saveSettings') settings.put(entity as Settings);
  }

  return {
    store,
    dump: () => ({
      objectives: objectives.values(), keyResults: keyResults.values(), points: points.values(),
      links: links.values(), movements: movements.values(), checkins: checkins.values(),
      orphans: orphans.values(), epochs: epochs.values(), settings: settings.values(),
    }),
  };
}

/** Réinjecte un dump dans un store vierge (côté navigateur). */
export async function hydrateStore(store: VigieStore, dump: StoreDump): Promise<void> {
  for (const epoch of dump.epochs ?? []) await store.saveEpoch(epoch);
  for (const settings of dump.settings ?? []) await store.saveSettings(settings);
  for (const objective of dump.objectives ?? []) await store.saveObjective(objective);
  for (const kr of dump.keyResults ?? []) await store.saveKeyResult(kr);
  for (const point of dump.points ?? []) await store.savePoint(point);
  for (const link of dump.links ?? []) await store.saveLink(link);
  for (const movement of dump.movements ?? []) await store.saveMovement(movement);
  for (const checkin of dump.checkins ?? []) await store.saveCheckin(checkin);
  for (const orphan of dump.orphans ?? []) await store.saveOrphan(orphan);
}

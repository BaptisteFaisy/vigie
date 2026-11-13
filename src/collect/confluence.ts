/**
 * Écriture Confluence (SPEC §13, §15, §20) : le dossier de revue et le
 * post-mortem sont les DEUX seuls endroits où Vigie écrit dans le wiki. Une page
 * générée est modifiable (réversibilité, §23). Dégradation gracieuse : sans droit
 * ni espace, rend `null` (l'app affiche alors le dossier en interne).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import type { ConfluenceGateway } from '../ports';
import { requestAsUserOrApp, toForgeRoute } from './forge-runtime';
import { jsonBody } from './http';
import type { Response } from './forge-runtime';

export interface ConfluenceDeps {
  request?: (route: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<Response>;
  baseUrl?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function defaultRequest(): (route: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<Response> {
  return async (path, init) => {
    const res = await requestAsUserOrApp((api) => api.requestConfluence(toForgeRoute(path), init as never));
    return res as unknown as Response;
  };
}

/** Crée l'adaptateur Confluence. */
export function createConfluenceGateway(deps: ConfluenceDeps = {}): ConfluenceGateway {
  const request = deps.request ?? defaultRequest();

  return {
    async createPage(spaceKey, title, storageHtml) {
      const body = JSON.stringify({
        type: 'page', title, space: { key: spaceKey },
        body: { storage: { value: storageHtml, representation: 'storage' } },
      });
      try {
        const res = await request('/rest/api/content', jsonBody('POST', body));
        if (!res.ok) { console.error('[confluence] HTTP', res.status, 'createPage'); return null; }
        const data = asRecord(await res.json());
        const id = typeof data.id === 'string' ? data.id : '';
        const links = asRecord(data._links);
        const base = typeof links.base === 'string' ? links.base : (deps.baseUrl ?? '');
        const webui = typeof links.webui === 'string' ? links.webui : '';
        if (!id) return null;
        return { ari: `ari:cloud:confluence::page/${id}`, url: `${base}${webui}` };
      } catch {
        return null;
      }
    },

    async updatePage(ari, storageHtml) {
      const id = ari.split('/').pop() ?? '';
      if (!id) return false;
      try {
        const current = asRecord(await (await request(`/rest/api/content/${id}?expand=version`)).json());
        const version = asRecord(current.version).number;
        const next = (typeof version === 'number' ? version : 0) + 1;
        const body = JSON.stringify({
          id, type: 'page', title: typeof current.title === 'string' ? current.title : 'Vigie',
          version: { number: next },
          body: { storage: { value: storageHtml, representation: 'storage' } },
        });
        const res = await request(`/rest/api/content/${id}`, jsonBody('PUT', body));
        if (!res.ok) console.error('[confluence] HTTP', res.status, 'updatePage');
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

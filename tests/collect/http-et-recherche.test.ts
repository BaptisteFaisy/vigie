/**
 * Garde de la régression qui a vidé le registre sur le vrai site : Jira Cloud
 * refuse un POST sans `Content-Type: application/json` (415). L'app le lisait
 * comme « 0 résultat ». Ces tests échouent si l'en-tête disparaît, et si un
 * échec HTTP redevient silencieux.
 */
import { describe, it, expect, vi } from 'vitest';
import { jsonBody, readJson } from '../../src/collect/http';
import { createJiraGateway } from '../../src/collect/jira';

function fakeResponse(status: number, body: unknown) {
  return { ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) } as never;
}

describe('readJson — un échec HTTP ne doit pas ressembler à zéro donnée', () => {
  it('journalise le statut 415 et rend null', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await readJson(fakeResponse(415, { title: 'Unsupported Media Type' }), 'jira', 'search/jql');
    expect(out).toBeNull();
    expect(String(err.mock.calls[0][0])).toContain('HTTP 415');
    err.mockRestore();
  });
});

describe('jsonBody', () => {
  it('pose l en-tête application/json', () => {
    const init = jsonBody('POST', '{}');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.method).toBe('POST');
  });
});

describe('searchIssues sur un Jira qui exige le Content-Type', () => {
  it('envoie l en-tête et lit les issues (jamais un faux 0)', async () => {
    const seen: unknown[] = [];
    const request = async (_route: string, init?: { method?: string; headers?: Record<string, string> }) => {
      seen.push(init);
      if (init?.method === 'POST' && init?.headers?.['Content-Type'] !== 'application/json') {
        return fakeResponse(415, { detail: 'Unsupported Media Type' });
      }
      return fakeResponse(200, {
        issues: [{ key: 'PAY-1', id: '10001', fields: { summary: 'Epic réel', issuetype: { name: 'Epic' }, project: { id: '1', key: 'PAY' } } }],
      });
    };
    const gw = createJiraGateway({ request: request as never });
    const issues = await gw.searchIssues('issuetype = Epic ORDER BY updated DESC', 8);
    const firstInit = seen[0] as { headers?: Record<string, string> };
    expect(firstInit.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(issues).toHaveLength(1);
    expect(issues[0].key).toBe('PAY-1');
  });
});

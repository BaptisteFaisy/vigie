/**
 * Point d'entrée de l'interface Forge (SPEC §19).
 *
 * Le REGISTRE DE BORD est la vue accessible (WCAG AA) : la même information que
 * la carte marine, en liste textuelle — états, signaux et faits, degrés, coûts,
 * projections. La « brume » (pas assez de recul) est TEXTUELLE (§23). Aucune
 * couleur globale par objectif (§5), aucune donnée de personne (VG-21).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import React, { useEffect, useState } from 'react';
import { Box, Spinner, Stack, Text, useProductContext } from '@forge/react';
import { invoke } from '@forge/bridge';

type Lang = 'en' | 'fr';

interface RegisterRow {
  objectiveId: string;
  title: string;
  state: string;
  degree: string;
  signals: { id: string; label: string; fact: string }[];
  costDays: number | null;
  projection: string;
}

interface RegisterData {
  rows: RegisterRow[];
  head: Record<string, string | number>;
  byState: Record<string, number>;
}

interface Coverage { source: string; rightsMissing: string[]; workLinkedPct: number; krLevelAPct: number; noData: boolean }
interface OrphanRow { issueKey: string; suggested: string | null; confidence: number; reason: string | null; daysSpent: number }

function resolveLanguage(locale: string | undefined): Lang {
  return locale && locale.startsWith('fr') ? 'fr' : 'en';
}

function Loading(): React.ReactElement {
  return (
    <Box>
      <Spinner size="medium" />
      <Text>…</Text>
    </Box>
  );
}

const HEADERS = { en: { title: 'Registre de bord', coverage: 'Coverage', ghosts: 'Ghosts' }, fr: { title: 'Registre de bord', coverage: 'Couverture', ghosts: 'Fantômes' } } as const;

export default function App(): React.ReactElement {
  const context = useProductContext();
  const lang = resolveLanguage(context?.locale);
  const [register, setRegister] = useState<RegisterData | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [ghosts, setGhosts] = useState<OrphanRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [reg, cov, ghostRows] = await Promise.all([
        invoke<RegisterData>('get-register', { language: lang }),
        invoke<Coverage>('get-coverage', { language: lang }),
        invoke<OrphanRow[]>('get-verso', { language: lang }),
      ]);
      if (alive) { setRegister(reg); setCoverage(cov); setGhosts(ghostRows ?? []); }
    })();
    return () => { alive = false; };
  }, [lang]);

  if (!register) return <Loading />;

  const headers = HEADERS[lang];
  return (
    <Stack space="space.300">
      <Text>{headers.title}</Text>
      {register.rows.length === 0 ? <Text>{lang === 'fr' ? 'Aucun objectif.' : 'No objectives.'}</Text> : (
        register.rows.map((row) => (
          <Box key={row.objectiveId} padding="space.200">
            <Text>{row.title}</Text>
            <Text>{row.state} · {row.degree} · {row.projection}</Text>
            {row.costDays !== null && <Text>{lang === 'fr' ? 'Coût' : 'Cost'} · {row.costDays} j</Text>}
            {row.signals.map((s) => <Text key={s.id}>{s.label} — {s.fact}</Text>)}
          </Box>
        ))
      )}
      {coverage && (
        <Box paddingBlockStart="space.300">
          <Text>{headers.coverage}</Text>
          <Text>{coverage.source} · {lang === 'fr' ? 'rattaché' : 'linked'} {coverage.workLinkedPct} % · {lang === 'fr' ? 'mesuré' : 'measured'} {coverage.krLevelAPct} %</Text>
          {coverage.rightsMissing.map((r) => <Text key={r}>{r}</Text>)}
          {coverage.noData && <Text>{lang === 'fr' ? 'Pas de données (distinct d’un droit manquant).' : 'No data (distinct from missing rights).'}</Text>}
        </Box>
      )}
      {ghosts.length > 0 && (
        <Box paddingBlockStart="space.300">
          <Text>{headers.ghosts}</Text>
          {ghosts.map((g) => <Text key={g.issueKey}>{g.issueKey} · {g.suggested ?? (lang === 'fr' ? 'pas assez de recul' : 'not enough data')} · {(g.confidence * 100).toFixed(0)} %</Text>)}
        </Box>
      )}
    </Stack>
  );
}
/**
 * Écran « global » (jira:globalPage) : registre de bord + couverture + verso.
 *
 * Le REGISTRE est la vue accessible (WCAG AA) : la même information que la carte
 * marine, en tableau. La « brume » (pas assez de recul) est TEXTUELLE (§23).
 * Aucune couleur globale par objectif (§5), aucune personne (VG-21).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import React from 'react';
import { Box, Spinner, Stack, Text } from '@forge/react';
import type { Lang } from '../../i18n/index';
import { t } from '../../i18n/index';
import { useInvoke } from '../hooks';

interface RegisterRow {
  objectiveId: string; title: string; state: string; degree: string;
  signals: { id: string; label: string; fact: string }[]; costDays: number | null; projection: string;
}
interface RegisterData { rows: RegisterRow[]; head: Record<string, string | number>; byState: Record<string, number> }
interface Coverage { source: string; rightsMissing: string[]; workLinkedPct: number; krLevelAPct: number; noData: boolean }
interface OrphanRow { issueKey: string; suggested: string | null; confidence: number; reason: string | null; daysSpent: number }

export function RegisterView({ language }: { language: Lang }): React.ReactElement {
  const register = useInvoke<RegisterData>('get-register', { language });
  const coverage = useInvoke<Coverage>('get-coverage', { language });
  const ghosts = useInvoke<OrphanRow[]>('get-verso', { language });

  if (register.loading) return <Box><Spinner size="medium" /><Text>…</Text></Box>;

  return (
    <Stack space="space.300">
      <Text>{t(language, 'reg.title')}</Text>
      {register.data && Object.entries(register.data.head).map(([label, value]) => (
        <Text key={label}>{label} : {String(value)}</Text>
      ))}
      {register.data && register.data.rows.map((row) => (
        <Box key={row.objectiveId} paddingBlockStart="space.100">
          <Text>{row.title}</Text>
          <Text>{row.state} · {row.degree} · {row.projection}</Text>
          {row.costDays !== null && <Text>{t(language, 'cost.days')} : {row.costDays}</Text>}
          {row.signals.map((s) => <Text key={s.id}>{s.label} — {s.fact}</Text>)}
        </Box>
      ))}
      {coverage.data && (
        <Box paddingBlockStart="space.200">
          <Text>{t(language, 'cover.title')}</Text>
          <Text>{coverage.data.source} · {coverage.data.workLinkedPct} % · {coverage.data.krLevelAPct} %</Text>
          {coverage.data.rightsMissing.map((r) => <Text key={r}>{r}</Text>)}
          {coverage.data.noData && <Text>{t(language, 'cover.noData')}</Text>}
        </Box>
      )}
      {ghosts.data && ghosts.data.length > 0 && (
        <Box paddingBlockStart="space.200">
          <Text>{t(language, 'verso.title')}</Text>
          {ghosts.data.map((g) => <Text key={g.issueKey}>{g.issueKey} · {g.suggested ?? t(language, 'verso.none')} · {Math.round(g.confidence * 100)} %</Text>)}
        </Box>
      )}
    </Stack>
  );
}

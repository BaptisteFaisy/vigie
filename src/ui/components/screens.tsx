/**
 * Écrans Forge secondaires (SPEC §19) — chacun ne demande QUE ses données.
 *
 *   IssuePanel   (jira:issuePanel)        : « quel objectif sert ce ticket ? » (< 2 s, cache)
 *   TheatreGadget(jira:dashboardGadget)   : compteur de théâtre de la période
 *   ProjectPage  (jira:projectPage)       : part rattachée + fantômes du projet
 *   SettingsPage (jira:projectSettingsPage): seuils réglables, périodes, époques, source
 *   DossierView  (confluence:macro)       : dossier de revue + 3 options chiffrées
 *
 * Aucune donnée de personne (VG-21), aucune couleur globale (§5), toute chaîne
 * via l'i18n (§24). Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import React from 'react';
import { Box, Spinner, Stack, Text } from '@forge/react';
import type { Lang } from '../../i18n/index';
import { t, theatreLabel } from '../../i18n/index';
import { useInvoke } from '../hooks';

interface FeatureLink { objectiveId: string; objectiveTitle: string; fraction: number; state: string; reason: string | null }
interface FeatureData { links: FeatureLink[]; orphan: boolean }

export function IssuePanel({ language }: { language: Lang }): React.ReactElement {
  const { data, loading } = useInvoke<FeatureData>('get-feature', { language });
  if (loading) return <Spinner size="small" />;
  if (!data || data.orphan) return <Box><Text>{t(language, 'panel.orphan')}</Text></Box>;
  if (data.links.length === 0) return <Text>{t(language, 'panel.none')}</Text>;
  return (
    <Stack space="space.100">
      <Text>{t(language, 'panel.title')}</Text>
      {data.links.map((link) => (
        <Text key={link.objectiveId}>
          {link.objectiveTitle} — {t(language, 'panel.fraction')} {Math.round(link.fraction * 100)} %
          {link.state === 'unmotivated' ? ` · ${t(language, 'panel.unmotivated')}` : ''}
        </Text>
      ))}
    </Stack>
  );
}

interface GadgetData { byState: Record<string, number>; dominantSignals: { signal: string; count: number }[] }

export function TheatreGadget({ language }: { language: Lang }): React.ReactElement {
  const { data, loading } = useInvoke<GadgetData>('get-gadget', { language });
  if (loading) return <Spinner size="small" />;
  if (!data) return <Text>—</Text>;
  const nonzero = Object.entries(data.byState).filter(([, n]) => n > 0);
  return (
    <Stack space="space.100">
      <Text>{t(language, 'gadget.title')}</Text>
      {nonzero.map(([state, n]) => <Text key={state}>{theatreLabel(language, state)} : {n}</Text>)}
      {data.dominantSignals.slice(0, 3).map((s) => <Text key={s.signal}>{s.signal} ×{s.count}</Text>)}
    </Stack>
  );
}

interface ProjectData { projectKey: string | null; linkedIssues: number; ghostCount: number; linkedPct: number; ghosts: { issueKey: string; daysSpent: number; suggested: string | null }[] }

export function ProjectPage({ language }: { language: Lang }): React.ReactElement {
  const { data, loading } = useInvoke<ProjectData>('get-project', { language });
  if (loading) return <Spinner size="small" />;
  if (!data) return <Text>—</Text>;
  return (
    <Stack space="space.100">
      <Text>{t(language, 'project.title')}{data.projectKey ? ` · ${data.projectKey}` : ''}</Text>
      <Text>{t(language, 'project.linked')} : {data.linkedPct} % ({data.linkedIssues})</Text>
      <Text>{t(language, 'project.ghosts')} : {data.ghostCount}</Text>
      {data.ghosts.slice(0, 8).map((g) => <Text key={g.issueKey}>{g.issueKey} · {g.daysSpent} j</Text>)}
    </Stack>
  );
}

interface SettingsData { settings: { thresholds: Record<string, number>; periodStart: string; periodEnd: string; sources: { active: string } } | null; epochs: { id: string; label: string; endsAt: string | null }[] }

export function SettingsPage({ language }: { language: Lang }): React.ReactElement {
  const { data, loading } = useInvoke<SettingsData>('get-settings', { language });
  if (loading) return <Spinner size="small" />;
  if (!data?.settings) return <Text>—</Text>;
  const thresholds = Object.entries(data.settings.thresholds);
  return (
    <Stack space="space.150">
      <Text>{t(language, 'settings.title')}</Text>
      <Text>{t(language, 'settings.period')} : {data.settings.periodStart.slice(0, 10)} → {data.settings.periodEnd.slice(0, 10)}</Text>
      <Text>{t(language, 'settings.source')} : {data.settings.sources.active}</Text>
      <Text>{t(language, 'settings.thresholds')} :</Text>
      {thresholds.map(([signal, value]) => <Text key={signal}>{signal} = {value}</Text>)}
      <Text>{t(language, 'settings.epochs')} :</Text>
      {data.epochs.map((e) => <Text key={e.id}>{e.label}{e.endsAt ? '' : ' (ouverte)'}</Text>)}
    </Stack>
  );
}

interface DossierOption { kind: string; label: string; detail: string; costDays: number | null; suggestedTarget: number | null; orphanedIssueKeys: string[] }
interface DossierData { objectiveId: string; theatreState: string | null; degree: string; options: DossierOption[] }

export function DossierView({ language, objectiveId }: { language: Lang; objectiveId: string }): React.ReactElement {
  const { data, loading } = useInvoke<DossierData>('get-dossier', { language, objectiveId });
  if (loading) return <Spinner size="small" />;
  if (!data) return <Text>—</Text>;
  return (
    <Stack space="space.150">
      <Text>{t(language, 'dossier.title')} — {data.objectiveId}</Text>
      <Text>{theatreLabel(language, data.theatreState)} · {t(language, `degree.${data.degree}`)}</Text>
      <Text>{t(language, 'dossier.options')} :</Text>
      {data.options.map((option) => (
        <Box key={option.kind} paddingBlockStart="space.050">
          <Text>{option.label} — {option.detail}</Text>
          {option.costDays !== null && <Text>{option.costDays} j</Text>}
          {option.orphanedIssueKeys.length > 0 && <Text>{option.orphanedIssueKeys.join(', ')}</Text>}
        </Box>
      ))}
    </Stack>
  );
}

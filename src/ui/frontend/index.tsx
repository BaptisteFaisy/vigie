/**
 * Point d'entrée de l'interface Forge (ressource `main` du manifest).
 *
 * ROUTE les modules déclarés au manifest vers leur écran d'après
 * `context.moduleKey` (SPEC §19) — c'est ce qui manquait : sans routage, tous
 * les modules rendaient le registre. La logique de transformation vit dans
 * `src/viewmodel/` (pure) ; ce fichier route, charge et rend.
 *
 *   vigie-global            → RegisterView (registre + couverture + verso)
 *   goal-panel              → IssuePanel   (quel objectif sert ce ticket, < 2 s)
 *   goal-project            → ProjectPage  (alignement du projet)
 *   theatre-gadget          → TheatreGadget(compteur de théâtre)
 *   goal-settings           → SettingsPage (seuils, périodes, époques, source)
 *   review-dossier-macro    → DossierView  (dossier + 3 options chiffrées)
 *   kr-series-macro         → KrSeriesView (série d'un RC)
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import React from 'react';
import { Box, Stack, Text, useProductContext } from '@forge/react';
import type { Lang } from '../../i18n/index';
import { t } from '../../i18n/index';
import { useInvoke } from '../hooks';
import { RegisterView } from '../components/RegisterView';
import { IssuePanel, TheatreGadget, ProjectPage, SettingsPage, DossierView } from '../components/screens';

/** Détecte la langue depuis la locale du contexte (SPEC §24 : en + fr). */
export function resolveLanguage(locale: string | undefined): Lang {
  return locale && locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export type ScreenKey = 'register' | 'issue-panel' | 'project' | 'gadget' | 'settings' | 'dossier' | 'kr-series';

/** Identifie l'écran d'après la clé du module Forge. */
export function resolveScreen(moduleKey: string | undefined): ScreenKey {
  const key = moduleKey ?? '';
  if (key.includes('goal-panel')) return 'issue-panel';
  if (key.includes('goal-project')) return 'project';
  if (key.includes('theatre-gadget')) return 'gadget';
  if (key.includes('goal-settings')) return 'settings';
  if (key.includes('review-dossier')) return 'dossier';
  if (key.includes('kr-series')) return 'kr-series';
  return 'register';
}

interface KrPoint { id: string; value: number; measuredAt: string; sourceLevel: string }

function KrSeriesView({ language, krId }: { language: Lang; krId: string }): React.ReactElement {
  const { data, loading } = useInvoke<KrPoint[]>('get-kr-series-view', { language, krId });
  if (loading) return <Text>…</Text>;
  if (!data || data.length === 0) return <Text>{t(language, 'projection.not-enough')}</Text>;
  return (
    <Stack space="space.050">
      {data.map((point) => (
        <Text key={point.id}>{point.measuredAt.slice(0, 10)} · {point.value} · {point.sourceLevel}</Text>
      ))}
    </Stack>
  );
}

export default function App(): React.ReactElement {
  const context = useProductContext();
  const language = resolveLanguage(context?.locale);
  const screen = resolveScreen(context?.moduleKey);
  const objectiveId = (context as { extension?: { content?: { objectiveId?: string } } })?.extension?.content?.objectiveId ?? 'obj-vivant';
  const krId = (context as { extension?: { content?: { krId?: string } } })?.extension?.content?.krId ?? 'kr_1';

  switch (screen) {
    case 'issue-panel': return <Box padding="space.200"><IssuePanel language={language} /></Box>;
    case 'project': return <Box padding="space.200"><ProjectPage language={language} /></Box>;
    case 'gadget': return <Box padding="space.150"><TheatreGadget language={language} /></Box>;
    case 'settings': return <Box padding="space.200"><SettingsPage language={language} /></Box>;
    case 'dossier': return <Box padding="space.200"><DossierView language={language} objectiveId={objectiveId} /></Box>;
    case 'kr-series': return <Box padding="space.200"><KrSeriesView language={language} krId={krId} /></Box>;
    default: return <Box padding="space.250"><RegisterView language={language} /></Box>;
  }
}

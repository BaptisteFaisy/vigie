/**
 * Dictionnaires du site (SPEC §24 : interface en anglais ET en français).
 * La soumission étant en anglais, `en` est la langue de repli.
 */

export const TOOLS = [
  ['get-objective', 'GET'], ['list-objectives', 'GET'], ['count-theatre', 'GET'],
  ['get-kr-series', 'GET'], ['get-projection', 'GET'], ['get-goal-cost', 'GET'],
  ['list-goal-orphans', 'GET'], ['get-concordance', 'GET'], ['get-review-dossier', 'GET'],
  ['get-portfolio-brief', 'GET'], ['link-work', 'CREATE'], ['record-kr-number', 'CREATE'],
  ['record-checkin', 'CREATE'], ['record-decision', 'CREATE'], ['open-postmortem', 'CREATE'],
];

const fr = {
  'skip': 'Aller au contenu',
  'nav.demo': 'Démo', 'nav.register': 'Registre', 'nav.verso': 'Fantômes', 'nav.model': 'Modèle', 'nav.arch': 'Architecture',
  'hero.kicker': 'Codegeist 2026 · Apps for Business Teams',
  'hero.title': 'Un objectif n’est réel que si du travail y est rattaché <em>et</em> si le nombre qui le mesure a bougé d’une façon qu’on peut rattacher à ce travail.',
  'hero.lede': 'Vigie relie les objectifs aux epics, recompte le mouvement chaque semaine, dit si la cible est atteignable et ce qu’elle coûte en jours — et nomme sans détour le « goal theatre ».',
  'hero.hook': 'La revue de trimestre affiche sept couleurs vertes. <strong>Qui a tapé ces nombres ?</strong>',
  'hero.badge': 'Données réellement calculées',
  'hero.badgeNote': 'Tout ce qui suit est la sortie des moteurs sur un trimestre synthétique marqué comme tel — aucune maquette.',
  'demo.title': 'Le portefeuille, calculé',
  'demo.sub': 'Trimestre de démonstration {period} · « maintenant » = {now} · {objectives} objectifs, {issues} tickets dont {ghosts} fantômes, {epochs} époques.',
  'kpi.linked': 'Travail rattaché', 'kpi.ghost': 'Travail fantôme', 'kpi.days': 'Jours consommés',
  'kpi.levelA': 'RC mesurés (niveau A)', 'kpi.unattr': 'Jours non attribués', 'kpi.objectives': 'Objectifs du trimestre',
  'kpi.method': 'Partagée entre objectifs, jamais doublée',
  'states.title': 'Objectifs par état',
  'cover.title': 'Couverture — ce que l’app voit et ne voit pas',
  'cover.source': 'Source active', 'cover.rights': 'Droits manquants', 'cover.linked': 'Travail rattaché',
  'cover.levelA': 'RC de niveau A', 'cover.note': 'Un droit manquant vide le résultat sans erreur : l’écran le dit, au lieu d’un zéro silencieux.',
  'reg.title': 'Le registre de bord',
  'reg.sub': 'La vue accessible : la même information que la carte marine, en tableau. Chaque état montre les faits qui le fondent.',
  'reg.caption': 'Objectifs, états, degrés, signaux, coût et projection',
  'reg.col.objective': 'Objectif', 'reg.col.state': 'État', 'reg.col.degree': 'Degré',
  'reg.col.signals': 'Signaux et faits', 'reg.col.cost': 'Coût', 'reg.col.projection': 'Projection',
  'reg.col.detail': 'Détail', 'reg.none': 'Aucun signal actif.', 'reg.show': 'Voir la fiche', 'reg.hide': 'Replier',
  'verso.title': 'Le verso : les fantômes',
  'verso.sub': 'La même lecture dans l’autre sens. C’est l’écran le plus utile du produit : il révèle la stratégie réellement exécutée face à la stratégie déclarée.',
  'verso.col.issue': 'Ticket', 'verso.col.days': 'Jours', 'verso.col.suggested': 'Objectif plausible',
  'verso.col.confidence': 'Confiance', 'verso.col.reason': 'Fondement',
  'verso.none': 'Aucun objectif plausible — pas assez de recul.',
  'prob.title': 'Les trois dérives, toujours les mêmes',
  'prob.never': 'Ce que l’app ne fait jamais',
  'model.title': 'Le modèle', 'model.degrees': 'Les quatre degrés', 'model.signals': 'Les treize signaux',
  'model.col.degree': 'Degré', 'model.col.requires': 'Ce qu’il faut', 'model.col.signal': 'Signal', 'model.col.fact': 'Fait déclencheur',
  'arch.title': 'Architecture', 'arch.mcp': 'Les 15 outils MCP',
  'arch.mcpSub': 'Aucun n’accepte un nom de personne en filtre, aucun n’en renvoie en sortie.',
  'arch.rovo': 'Agent Rovo « La vigie »',
  'foot.repo': 'Dépôt', 'foot.contest': 'Codegeist 2026', 'foot.generated': 'Données générées le {at}',
  'concl.atteignable': 'atteignable', 'concl.atteignable-sous-condition': 'atteignable sous condition',
  'concl.pas-atteignable': 'pas atteignable au rythme actuel', 'concl.pas-assez-de-recul': 'pas assez de recul',
  'proj.range': 'fourchette', 'proj.n': 'effectif', 'proj.weeks': 'semaines', 'proj.method': 'méthode',
  'proj.assumptions': 'Hypothèses', 'proj.levers': 'Ce qui ferait changer la réponse',
  'cost.days': 'jours', 'cost.method': 'méthode', 'cost.shared': 'partagé avec', 'cost.ratio': 'jours par point gagné',
  'deg.facts': 'Fondement du degré', 'conc.title': 'Concordance (jamais une causalité)',
  'conc.work': 'travail en mouvement', 'conc.number': 'nombre en mouvement', 'conc.window': 'fenêtre',
  'kr.title': 'Résultat clé', 'kr.baseline': 'départ', 'kr.target': 'cible', 'kr.current': 'actuel', 'kr.source': 'source',
  'links.title': 'Rattachements', 'links.none': 'Aucun rattachement.',
  'period.note': 'Période close ({p}) — l’objectif n’a jamais été refermé.',
  'gap.title': 'Recalculé vs recopié',
  'gap.detail': '{copied} tapé à la main (niveau {level}) — recalculé à {recomputed} : écart de {gap}.',
  'gap.none': 'Aucun écart : la valeur est recalculée, pas recopiée.',
  'decision.title': 'Décision de revue',
  'decision.followed': 'suivie d’effet',
  'decision.notFollowed': 'NON suivie d’effet',
  'decision.pending': 'à vérifier à la prochaine période',
  'kr.recomputedFrom': 'recalculé depuis',
};

const en = {
  'skip': 'Skip to content',
  'nav.demo': 'Demo', 'nav.register': 'Register', 'nav.verso': 'Ghosts', 'nav.model': 'Model', 'nav.arch': 'Architecture',
  'hero.kicker': 'Codegeist 2026 · Apps for Business Teams',
  'hero.title': 'An objective is real only if work is attached to it <em>and</em> if the number that measures it moved in a way traceable to that work.',
  'hero.lede': 'Vigie links goals to epics, recomputes movement every week, says whether the target is reachable and what it costs in days — and names goal theatre plainly.',
  'hero.hook': 'The quarterly review shows seven green colours. <strong>Who typed these numbers?</strong>',
  'hero.badge': 'Actually computed data',
  'hero.badgeNote': 'Everything below is the real output of the engines on a synthetic quarter marked as such — no mock-up.',
  'demo.title': 'The portfolio, computed',
  'demo.sub': 'Demo quarter {period} · “now” = {now} · {objectives} objectives, {issues} tickets of which {ghosts} ghosts, {epochs} epochs.',
  'kpi.linked': 'Work linked', 'kpi.ghost': 'Ghost work', 'kpi.days': 'Days consumed',
  'kpi.levelA': 'KRs measured (level A)', 'kpi.unattr': 'Unattributed days', 'kpi.objectives': 'Objectives this quarter',
  'kpi.method': 'Shared across objectives, never doubled',
  'states.title': 'Objectives by state',
  'cover.title': 'Coverage — what the app sees and does not see',
  'cover.source': 'Active source', 'cover.rights': 'Missing rights', 'cover.linked': 'Work linked',
  'cover.levelA': 'Level-A key results', 'cover.note': 'A missing right empties the result without an error: the screen says so, instead of a silent zero.',
  'reg.title': 'The ship’s register',
  'reg.sub': 'The accessible view: the same information as the nautical chart, as a table. Every state shows the facts behind it.',
  'reg.caption': 'Objectives, states, degrees, signals, cost and projection',
  'reg.col.objective': 'Objective', 'reg.col.state': 'State', 'reg.col.degree': 'Degree',
  'reg.col.signals': 'Signals and facts', 'reg.col.cost': 'Cost', 'reg.col.projection': 'Projection',
  'reg.col.detail': 'Detail', 'reg.none': 'No active signal.', 'reg.show': 'Open the sheet', 'reg.hide': 'Collapse',
  'verso.title': 'The other side: ghosts',
  'verso.sub': 'The same reading in the other direction. The most useful screen in the product: it reveals the strategy actually executed against the strategy declared.',
  'verso.col.issue': 'Ticket', 'verso.col.days': 'Days', 'verso.col.suggested': 'Plausible objective',
  'verso.col.confidence': 'Confidence', 'verso.col.reason': 'Basis',
  'verso.none': 'No plausible objective — not enough data.',
  'prob.title': 'The three drifts, always the same',
  'prob.never': 'What the app never does',
  'model.title': 'The model', 'model.degrees': 'The four degrees', 'model.signals': 'The thirteen signals',
  'model.col.degree': 'Degree', 'model.col.requires': 'What it takes', 'model.col.signal': 'Signal', 'model.col.fact': 'Triggering fact',
  'arch.title': 'Architecture', 'arch.mcp': 'The 15 MCP tools',
  'arch.mcpSub': 'None accepts a person’s name as a filter, none returns one.',
  'arch.rovo': 'Rovo agent “La vigie”',
  'foot.repo': 'Repository', 'foot.contest': 'Codegeist 2026', 'foot.generated': 'Data generated on {at}',
  'concl.atteignable': 'reachable', 'concl.atteignable-sous-condition': 'reachable with conditions',
  'concl.pas-atteignable': 'not reachable at the current pace', 'concl.pas-assez-de-recul': 'not enough data',
  'proj.range': 'range', 'proj.n': 'sample', 'proj.weeks': 'weeks', 'proj.method': 'method',
  'proj.assumptions': 'Assumptions', 'proj.levers': 'What would change the answer',
  'cost.days': 'days', 'cost.method': 'method', 'cost.shared': 'shared with', 'cost.ratio': 'days per point gained',
  'deg.facts': 'Basis of the degree', 'conc.title': 'Concordance (never a causality)',
  'conc.work': 'work moved', 'conc.number': 'number moved', 'conc.window': 'window',
  'kr.title': 'Key result', 'kr.baseline': 'baseline', 'kr.target': 'target', 'kr.current': 'current', 'kr.source': 'source',
  'links.title': 'Attachments', 'links.none': 'No attachment.',
  'period.note': 'Closed period ({p}) — the objective was never closed.',
  'gap.title': 'Recomputed vs typed',
  'gap.detail': '{copied} typed by hand (level {level}) — recomputed to {recomputed}: a gap of {gap}.',
  'gap.none': 'No gap: the value is recomputed, not copied.',
  'decision.title': 'Review decision',
  'decision.followed': 'followed through',
  'decision.notFollowed': 'NOT followed through',
  'decision.pending': 'to be verified next period',
  'kr.recomputedFrom': 'recomputed from',
};

/** Noms des sept états, avec ce qui les produit (§7). */
export const STATES = {
  fr: {
    'vivant': ['Vivant', 'Série de niveau A ou B qui bouge + travail rattaché qui bouge + pointage récent.'],
    'narratif': ['Narratif', 'Pointages fréquents + travail gelé + nombre sans source.'],
    'travaille-muet': ['Travaillé-muet', 'Le travail bouge, mais le résultat clé est non falsifiable ou la série est plate.'],
    'decoratif': ['Décoratif', 'Rattachement en masse + rattachement hors périmètre + aucun commit.'],
    'orphelin': ['Orphelin', 'Aucun travail rattaché.'],
    'sous-calibre': ['Sous-calibré', 'Cible atteinte avant la mi-période, ou cible identique à la période précédente.'],
    'mort-vivant': ['Mort-vivant', 'Période close, objectif jamais refermé, personne ne l’a touché.'],
  },
  en: {
    'vivant': ['Alive', 'A level-A or B series that moves + attached work that moves + a recent check-in.'],
    'narratif': ['Narrative', 'Frequent check-ins + frozen work + a sourceless number.'],
    'travaille-muet': ['Mute worker', 'Work moves, but the key result is not falsifiable or the series is flat.'],
    'decoratif': ['Decorative', 'Bulk attachment + out-of-scope attachment + no commit.'],
    'orphelin': ['Orphan', 'No work attached.'],
    'sous-calibre': ['Under-calibrated', 'Target reached before mid-period, or identical to the previous period.'],
    'mort-vivant': ['Zombie', 'Period closed, objective never closed, nobody touched it.'],
  },
};

/** Les quatre degrés et ce qu’il faut pour chacun (§6). */
export const DEGREES = {
  fr: [
    ['declare', 'Déclaré', 'Quelqu’un a écrit « en bonne voie ». L’app montre la date du pointage — rien d’autre.'],
    ['travaille', 'Travaillé', 'Du travail rattaché a bougé : transitions, commits, fermetures.'],
    ['avance', 'Avancé', 'La série du résultat clé a bougé dans le sens attendu, depuis une source A ou B.'],
    ['concordant', 'Concordant', 'Avancé <em>et</em> le mouvement du travail précède celui du nombre, dans le même périmètre. Pas une causalité.'],
  ],
  en: [
    ['declare', 'Declared', 'Someone wrote “on track”. The app shows the check-in date — nothing else.'],
    ['travaille', 'Worked', 'Attached work moved: transitions, commits, closures.'],
    ['avance', 'Advanced', 'The key result series moved in the expected direction, from an A or B source.'],
    ['concordant', 'Concordant', 'Advanced <em>and</em> work movement precedes the number’s, in the same scope. Not a causality.'],
  ],
};

/** Les treize signaux et leur fait déclencheur (§7). */
export const SIGNALS = {
  fr: [
    ['S0', 'Aucun rattachement', '0 ticket lié.'],
    ['S1', 'Rattachement en masse', '≥ 5 tickets liés le même jour par le même acteur.'],
    ['S2', 'Travail gelé', 'Aucune transition ni commit sur les tickets rattachés depuis 21 jours.'],
    ['S3', 'Nombre sans source', 'Résultat clé de niveau C.'],
    ['S4', 'Série plate', 'Aucune variation sur 6 semaines de mesures.'],
    ['S5', 'Récit sans travail', '≥ 3 pointages pendant une période sans mouvement.'],
    ['S6', 'Objectif non falsifiable', 'RC sans nombre ni type de preuve déclaré.'],
    ['S7', 'Rattachement hors périmètre', 'Composants ou projets des tickets liés sans rapport avec le périmètre déclaré.'],
    ['S8', 'Atteinte précoce', 'Cible atteinte avant 50 % de la période.'],
    ['S9', 'Cible répétée', 'Cible identique à celle de la période précédente.'],
    ['S10', 'Silence', 'Aucun pointage depuis 45 jours alors que le travail bouge.'],
    ['S11', 'Mort-vivant', 'Période close depuis 30 jours, objectif toujours ouvert.'],
    ['S12', 'Double comptage', 'Même ticket rattaché à ≥ 3 objectifs sans fraction déclarée.'],
  ],
  en: [
    ['S0', 'No attachment', '0 linked ticket.'],
    ['S1', 'Bulk attach', '≥ 5 tickets linked the same day by the same actor.'],
    ['S2', 'Frozen work', 'No transition or commit on linked tickets for 21 days.'],
    ['S3', 'Sourceless number', 'A level-C key result.'],
    ['S4', 'Flat series', 'No variation over 6 weeks of measurements.'],
    ['S5', 'Story without work', '≥ 3 check-ins during a no-movement period.'],
    ['S6', 'Not falsifiable', 'A key result with neither a number nor a declared proof type.'],
    ['S7', 'Out of scope', 'Components or projects of linked tickets unrelated to the declared scope.'],
    ['S8', 'Early reach', 'Target reached before 50 % of the period.'],
    ['S9', 'Repeated target', 'Target identical to the previous period’s.'],
    ['S10', 'Silence', 'No check-in for 45 days while work moves.'],
    ['S11', 'Zombie', 'Period closed 30 days ago, objective still open.'],
    ['S12', 'Double count', 'Same ticket attached to ≥ 3 objectives with no declared fraction.'],
  ],
};

/** Les trois dérives (§2) et les interdits (§5). */
export const PROBLEM = {
  fr: [
    ['Le décor', 'L’objectif existe, quinze tickets y sont « rattachés », le pointage dit « en bonne voie ». Rien de mesurable n’a bougé. Le rattachement est décoratif.'],
    ['Le récit sans le travail', 'L’objectif est pointé chaque semaine avec des phrases riches, pendant que ses epics sont gelés. L’activité visible est celle du commentaire.'],
    ['Le travail sans objectif', 'Des epics avancent qui ne servent aucun objectif déclaré. Personne ne le voit, parce que personne ne regarde dans ce sens.'],
  ],
  en: [
    ['The scenery', 'The objective exists, fifteen tickets are “attached”, the check-in says “on track”. Nothing measurable moved. The attachment is decorative.'],
    ['The story without the work', 'The objective is checked in weekly with rich sentences while its epics are frozen. The visible activity is the comment’s.'],
    ['Work without an objective', 'Epics move that serve no declared objective. Nobody sees it, because nobody looks in that direction.'],
  ],
};

export const NEVER = {
  fr: [
    'Elle ne note personne : aucune statistique par individu, aucun classement.',
    'Elle ne décide rien : elle prépare le dossier, la décision est humaine et enregistrée.',
    'Elle n’invente pas de causalité : elle dit « concordant », jamais « causé par ».',
    'Elle ne verdit rien : aucune couleur globale ; un RC en baisse et un en hausse ne se compensent pas.',
    'Elle ne conclut pas sans effectif : sous le seuil, la réponse est « pas assez de recul ».',
    'Elle n’exige aucune licence : registre local Jira sinon, avec import depuis un tableur.',
  ],
  en: [
    'It rates nobody: no per-person statistic, no ranking.',
    'It decides nothing: it prepares the dossier, the decision is human and recorded.',
    'It invents no causality: it says “concordant”, never “caused by”.',
    'It greens nothing: no overall colour; a falling KR and a rising one do not offset.',
    'It never concludes without a sample: below the threshold, the answer is “not enough data”.',
    'It requires no licence: a local Jira register otherwise, with spreadsheet import.',
  ],
};

/** Les deux apps jumelles et les trois adaptateurs (§20). */
export const ARCH = {
  fr: [
    ['App 1 — Vigie (Jira)', 'Tout le produit : écrans, calculs, 15 outils MCP, agent Rovo, dossier de revue. Lit le Teamwork Graph.'],
    ['App 2 — Le graveur', 'Connecteur Teamwork Graph : grave les objectifs en work items externes, en agrégats uniquement. Une app ne peut pas faire les deux — d’où deux apps jumelles reliées par un pont signé.'],
    ['Trois adaptateurs de source', 'Teamwork Graph (objectifs natifs) · registre local Jira (toujours disponible, zéro licence) · import tableur (one-shot, avec provenance). L’écran de couverture dit lequel est actif.'],
    ['Un point de calcul unique', 'Le moteur qualifie chaque objectif : signaux, état, degré, projection, coût, concordance. Écrans, MCP, agent et recalcul nocturne lisent la même ligne.'],
  ],
  en: [
    ['App 1 — Vigie (Jira)', 'The whole product: screens, computation, 15 MCP tools, the Rovo agent, the review dossier. Reads the Teamwork Graph.'],
    ['App 2 — The engraver', 'A Teamwork Graph connector: engraves objectives as external work items, aggregates only. One app cannot do both — hence two twin apps joined by a signed bridge.'],
    ['Three source adapters', 'Teamwork Graph (native goals) · local Jira register (always available, no licence) · spreadsheet import (one-shot, with provenance). The coverage screen says which one is active.'],
    ['One single computation point', 'The engine qualifies each objective: signals, state, degree, projection, cost, concordance. Screens, MCP, the agent and the nightly run all read the same row.'],
  ],
};

export const ROVO = {
  fr: [
    'Quels objectifs du trimestre sont décoratifs, et pourquoi ?',
    'Est-ce que « réduire les incidents de paiement » a bougé, et qu’est-ce qui a bougé en même temps ?',
    'Combien de jours a consommé cet objectif, pour quel mouvement ?',
    'Quels epics ne servent aucun objectif déclaré ?',
    'Prépare le dossier de revue de l’objectif X.',
    'Si on abandonne Y, quel travail devient orphelin ?',
    'Quelle part de nos résultats clés est mesurée plutôt que déclarée ?',
  ],
  en: [
    'Which objectives this quarter are decorative, and why?',
    'Did “reduce payment incidents” move, and what moved at the same time?',
    'How many days did this objective consume, for what movement?',
    'Which epics serve no declared objective?',
    'Prepare the review dossier of objective X.',
    'If we abandon Y, which work becomes orphaned?',
    'What share of our key results is measured rather than declared?',
  ],
};

export const DICT = { fr, en };

export function t(lang, key) {
  return DICT[lang]?.[key] ?? en[key] ?? key;
}

/** Interpolation simple : {nom} → valeur. */
export function tf(lang, key, values) {
  return t(lang, key).replace(/\{(\w+)\}/g, (_, k) => (values?.[k] ?? `{${k}}`));
}

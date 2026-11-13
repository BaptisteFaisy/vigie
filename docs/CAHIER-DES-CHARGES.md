# Objectifs réels — cahier des charges

> Codegeist 2026 · catégorie **Apps for Business Teams** (transversal direction/produit/ingénierie)
> Bonus visés : Teamwork Graph (principal, via connecteur), Agents Rovo, MCP, Marketplace
> Version 1 du 11 novembre 2026 · soumission avant le mardi 22 décembre 2026, 21 h (Paris)
> Nom de dépôt proposé : `vigie` · nom public : **Vigie — real goals** · sous-titre produit : *Objectifs réels*

## 1. L'idée en une phrase

Un objectif n'est réel que si du travail y est rattaché **et** si le nombre qui le mesure a bougé d'une façon qu'on peut rattacher à ce travail : l'app relie les objectifs aux epics, recompte le mouvement chaque semaine, dit si la cible est atteignable, ce qu'elle coûte en jours, et nomme sans détour le « goal theatre » — les objectifs qui ont l'air vivants et ne le sont pas.

## 2. Le problème

Les objectifs sont écrits en début de trimestre, relus en fin de trimestre, et entre les deux ils vivent dans un tableur ou dans une page que plus personne n'ouvre. Trois dérives, toujours les mêmes :

1. **Le décor.** L'objectif existe, quinze tickets y sont « rattachés », le pointage dit « en bonne voie ». Rien de mesurable n'a bougé. Le rattachement est décoratif : il sert à montrer que l'objectif est servi, pas à le servir.
2. **Le récit sans le travail.** L'objectif est pointé chaque semaine avec des phrases riches, pendant que ses epics sont gelés. L'activité visible est celle du commentaire, pas celle du chantier.
3. **Le travail sans objectif.** À l'inverse, des epics avancent qui ne servent aucun objectif déclaré — soit la liste des objectifs est fausse, soit ce travail n'a pas été décidé. Personne ne le voit, parce que personne ne regarde dans ce sens.

À cela s'ajoute le problème de fond : **le nombre d'un résultat clé est tapé à la main**. Une fois par trimestre, quelqu'un recopie un chiffre dans une case. Le chiffre réel, lui, existe déjà — dans Jira, dans les incidents JSM, dans les déploiements, dans la dette chiffrée. Personne ne relie les deux.

Résultat : la direction demande « où en sommes-nous ? » et reçoit une couleur. Une couleur verte, rouge ou orange, choisie par la personne qui a le plus intérêt à ce qu'elle soit verte.

Ce qu'il faut pour répondre autrement existe déjà : Jira connaît le travail et son mouvement ; le graphe d'Atlassian relie objectifs, travail, personnes et résultats ; les autres apps du portefeuille produisent déjà des nombres fiables (coût de la dette, incidents, preuves, releases). Il manque l'outil qui rapproche les trois, qui calcule au lieu de recopier, et qui a la rigueur de dire « pas assez de recul » quand c'est le cas.

## 3. Utilisateurs

| Qui | Ce qu'il fait | Ce qu'il attend |
|---|---|---|
| Propriétaire d'objectif | Tient son objectif | Voir si ça bouge vraiment, ce qui manque, et quoi demander |
| Direction / chef de produit | Arbitre le portefeuille | Un état par objectif fondé sur des faits, pas sur des couleurs |
| Tech lead | Rattache le travail | Rattacher vite, honnêtement, sans que ce soit retenu contre l'équipe |
| Développeur | Travaille | Savoir à quoi sert son ticket — ou apprendre qu'il ne sert à rien de déclaré |
| PMO / revue de trimestre | Prépare la revue | Le dossier déjà écrit, avec les chiffres, les signaux et les options |
| Agent / orchestrateur (MCP) | Choisit du travail | La liste du travail qui sert un objectif prioritaire |

## 4. Vocabulaire du produit

- **Objectif** : une intention portée par un propriétaire, pour une période, avec un ou plusieurs résultats clés.
- **Résultat clé (RC)** : la mesure d'un objectif. De deux sortes : **nombre** (une valeur, une cible, un sens) ou **binaire** (fait / pas fait, qui exige alors une preuve).
- **Source du nombre** : d'où vient la valeur d'un RC, à trois niveaux (§ 8) : **A** calculée par l'app depuis les données Atlassian, **B** saisie avec une référence vérifiable, **C** déclarée sans source.
- **Série** : la suite des valeurs mesurées d'un RC, chacune avec sa date, sa source et son niveau.
- **Rattachement** : le lien entre un objectif et un ticket, avec **une raison écrite** et **une fraction** (un ticket peut servir plusieurs objectifs).
- **Mouvement** : ce qui a changé sur le travail rattaché pendant une semaine : transitions, commits, fermetures, délai.
- **Avancé / travaillé / déclaré / concordant** : les quatre degrés (§ 6). L'app ne dit jamais « prouvé » à partir d'une déclaration.
- **État de théâtre** : la qualification d'un objectif d'après des faits — vivant, narratif, travaillé-muet, décoratif, orphelin, sous-calibré, mort-vivant (§ 7).
- **Signal** : un fait mesurable qui fonde un état. Chaque signal affiche le fait, son seuil et sa date.
- **Écart de route** : l'écart entre la projection et la cible.
- **Projection** : la valeur attendue en fin de période, avec fourchette, effectif et méthode — ou « pas assez de recul ».
- **Coût de l'intention** : les jours consommés par le travail rattaché, avec la méthode et la part partagée.
- **Époque** : une période où l'organisation n'a pas changé (mêmes équipes, même périmètre). Une réorganisation ouvre une époque.
- **Fantôme** : un ticket qui avance sans servir aucun objectif déclaré.
- **Dossier de revue** : la page générée pour la revue de trimestre : faits, signaux, projection, coût, trois options, décision prise.
- **Post-mortem d'objectif** : le bilan écrit à la clôture — le nombre a-t-il bougé, le travail a-t-il atterri, qu'est-ce qu'on en retient.

## 5. Ce que l'app ne fait pas

- elle **ne note personne** : aucune statistique par individu, aucun classement, et les signaux portent sur le travail — jamais sur la qualité de la prose d'un pointage ;
- elle **ne décide rien** : elle prépare le dossier d'abandon ou de re-ciblage, la décision est humaine et enregistrée ;
- elle **n'invente pas de causalité** : elle dit « concordant », pas « causé par » ;
- elle **ne verdit rien** : aucune couleur globale par objectif ; un RC en baisse et un RC en hausse ne se compensent pas ;
- elle **ne conclut pas sans effectif** : sous le seuil, la réponse est « pas assez de recul », affichée comme les autres ;
- elle **n'exige aucune licence** : elle lit les objectifs natifs dans le graphe s'ils y sont, sinon elle fonctionne sur un registre local Jira, avec import depuis un tableur (§ 20).

## 6. Les quatre degrés

Un objectif « avance » veut dire quatre choses différentes. L'app les sépare, et affiche toujours le degré atteint avec son fondement.

| Degré | Ce qu'il faut | Ce que l'app montre |
|---|---|---|
| **Déclaré** | Quelqu'un a écrit « en bonne voie » | La date et l'auteur du pointage — rien d'autre |
| **Travaillé** | Du travail rattaché a bougé : transitions, commits, fermetures | Le mouvement de la semaine, ticket par ticket |
| **Avancé** | La série du RC a bougé dans le sens attendu, depuis une source A ou B | Les points de la série, leur source, leur niveau |
| **Concordant** | Avancé **et** le mouvement du travail précède le mouvement du nombre, dans le même périmètre | Les deux séries superposées, la fenêtre de concordance, et **ce qui d'autre a changé** dans la fenêtre |

Le quatrième degré n'est pas une preuve de causalité, et l'interface le dit : « concordant » signifie que rien, dans ce qu'on observe, ne contredit l'attribution. L'app liste systématiquement les autres mouvements de la même période (autres objectifs, releases, incidents, campagnes) pour que le lecteur voie ce qu'elle ne peut pas exclure.

## 7. Les sept états, et les douze signaux

Chaque état résulte de signaux. Chaque signal est un fait daté, avec son seuil réglable. Rien n'est affirmé sans le fait qui le fonde.

| État | Signaux qui le produisent |
|---|---|
| **Vivant** | Série de niveau A ou B qui bouge + travail rattaché qui bouge + pointage récent |
| **Narratif** | Pointages fréquents (S5) + travail gelé (S2) + nombre de niveau C (S3) |
| **Travaillé-muet** | Travail qui bouge + RC non falsifiable (S6) ou série plate (S4) |
| **Décoratif** | Rattachement en masse (S1) + rattachement hors périmètre (S7) + aucun commit sur les tickets rattachés |
| **Orphelin** | Aucun travail rattaché (S0) |
| **Sous-calibré** | Cible atteinte avant la mi-période (S8) ou cible identique à la période précédente (S9) |
| **Mort-vivant** | Période close, objectif non refermé, personne ne l'a touché (S11) |

Les signaux, tous faits mesurables :

| # | Signal | Fait déclencheur |
|---|---|---|
| S0 | Aucun rattachement | 0 ticket lié |
| S1 | Rattachement en masse | ≥ 5 tickets liés le même jour par le même acteur |
| S2 | Travail gelé | Aucune transition ni commit sur les tickets rattachés depuis 21 jours |
| S3 | Nombre sans source | RC de niveau C |
| S4 | Série plate | Aucune variation sur 6 semaines de mesures |
| S5 | Récit sans travail | ≥ 3 pointages pendant une période sans mouvement (S2 actif) |
| S6 | Objectif non falsifiable | RC sans nombre ni type de preuve déclaré |
| S7 | Rattachement hors périmètre | Composants ou projets des tickets liés sans rapport avec le périmètre déclaré de l'objectif |
| S8 | Atteinte précoce | Cible atteinte avant 50 % de la période |
| S9 | Cible répétée | Cible identique à celle de la période précédente |
| S10 | Silence | Aucun pointage depuis 45 jours alors que le travail bouge |
| S11 | Mort-vivant | Période close depuis 30 jours, objectif toujours ouvert |
| S12 | Double comptage | Même ticket rattaché à ≥ 3 objectifs sans fraction déclarée |

Un signal peut être écarté, avec une raison écrite et une date de réexamen — un écart n'est pas éternel.

**Le verso : le travail sans objectif.** La même lecture dans l'autre sens produit la liste des **fantômes** : epics et tickets qui avancent, consomment des jours, et ne servent aucun objectif déclaré. Pour chacun, l'app propose un objectif plausible (composant, équipe, mots du titre, graphe) avec une confiance — et dit « pas assez de recul » quand elle ne peut pas. C'est l'écran le plus utile du produit : il révèle la stratégie réelle, celle qui est exécutée, face à la stratégie déclarée.

## 8. La source du nombre

Trois niveaux, affichés partout où une valeur apparaît. C'est la pièce centrale : un objectif dont tous les RC sont de niveau C ne peut pas sortir de « déclaré ».

| Niveau | Ce que c'est | Exemples |
|---|---|---|
| **A — calculé** | L'app recompute la valeur depuis les données Atlassian, à la demande et chaque nuit | % d'epics rattachés en Done ; délai médian ; nombre d'incidents JSM ; CSAT JSM ; déploiements réussis ; coût de la dette (via `laddition`) ; taux de critères prouvés (via `preuve-a-l-appui`) |
| **B — référencé** | Valeur saisie par une personne, avec une référence vérifiable et une date | Lien vers un tableau de bord, un export, un rapport fournisseur, une page de mesure |
| **C — déclaré** | Valeur saisie sans source | Un nombre tapé dans une case |

Règles : un RC de niveau A est **recalculé**, jamais recopié ; un passage de A à C est signalé (régression de la source) ; un RC binaire exige un **type de preuve** et reprend la grille de force de `preuve-a-l-appui` (machine / attestée / déclarée). Chaque point de série conserve son niveau : on peut voir un objectif dont la mesure s'est dégradée au fil du trimestre.

## 9. Le rattachement honnête

Rattacher du travail à un objectif est le geste qui fonde tout le reste. Il est donc encadré :

- **une raison écrite** par rattachement (une phrase suffit ; sans raison, le lien est marqué « non motivé » et nourrit S1) ;
- **une fraction** quand un ticket sert plusieurs objectifs — par défaut 1/n, réglable, jamais 100 % partout (S12) ;
- **des propositions, pas des devinettes** : l'app suggère des candidats depuis le graphe (composant, service, équipe, titres proches) avec une confiance, et une personne confirme ;
- **une trace** : qui a rattaché quoi, quand — non pour noter, mais parce qu'un rattachement en masse le même jour est un fait qui compte (S1) ;
- **un détachement expliqué** : quand un objectif est abandonné, son travail ne disparaît pas — il devient fantôme, et l'app le dit.

## 10. La projection honnête

Pour chaque RC de niveau A ou B : la valeur attendue en fin de période, calculée sur le rythme des 6 dernières semaines.

- **fourchette** systématique (intervalle de confiance, pas un point) ;
- **effectif** affiché : nombre de semaines ou de tickets utilisés ;
- **conclusion unique** : « atteignable », « atteignable sous condition », « pas atteignable au rythme actuel », ou « pas assez de recul » (sous 4 semaines de données, ou sous 5 tickets rattachés) ;
- **hypothèses visibles** : rythme constant, pas d'effet de fin de période, périmètre inchangé — et l'époque en cours (§ 16) ;
- **ce qui ferait changer la réponse** : « il manque environ 3 epics du type X, ou un doublement du rythme sur 4 semaines ».

Aucune projection n'est affichée sans sa fourchette et son effectif. Un « pas assez de recul » est une réponse complète.

## 11. Le coût de l'intention

Ce que l'objectif a consommé, en jours, et ce que ça a produit.

- trois sources de jours, par ordre de préférence, **la source retenue étant affichée** : temps saisi → estimation → durée réelle (cycle time des tickets clos) ;
- **part partagée** : un ticket rattaché à trois objectifs compte pour un tiers dans chacun, et le total du portefeuille ne double jamais — l'écran de portefeuille montre la part non attribuée ;
- le **ratio** : jours consommés par point de RC gagné, avec fourchette, et le même ratio pour les objectifs semblables de la période ;
- l'**historique** : le coût des périodes précédentes, par époque.

Ce n'est pas un outil de contrôle des personnes : c'est le prix d'une intention, comparable d'un objectif à l'autre. Le même chiffre sert à la revue de trimestre pour répondre à « qu'est-ce qu'on arrête ? ».

## 12. Le pointage inversé

Le pointage habituel commence par une couleur choisie à l'intuition. Ici, l'ordre est inversé :

1. l'app **pré-remplit les faits** : mouvement du travail de la semaine, points de série nouveaux, état, signaux actifs, projection, coût cumulé ;
2. la personne **lit les faits**, puis écrit son interprétation ;
3. les deux sont affichés **côte à côte**, dans le journal de bord de l'objectif ;
4. si l'interprétation contredit les faits (« en bonne voie » avec S2 et S4 actifs), l'app ne censure rien : elle affiche les faits à côté, et l'écart devient visible pour tous.

Rien n'est envoyé, noté ni signalé à quiconque : le journal est celui de l'objectif, pas celui de la personne.

## 13. La revue de trimestre

Pour chaque objectif, un **dossier** généré (page Confluence, modifiable) :

- l'état et les signaux, chacun avec son fait ;
- la série du RC, ses niveaux de source, sa dérive éventuelle ;
- la projection et son écart de route ;
- le coût, sa méthode, sa part partagée ;
- le mouvement du travail rattaché, et ce qui n'a pas bougé ;
- les autres choses qui ont changé dans la période (releases, incidents, autres objectifs) ;
- **trois options chiffrées** : continuer tel quel, re-cibler (avec la cible que le rythme rend crédible), abandonner (avec le travail qui devient fantôme) ;
- la **décision prise**, sa raison, sa date, et si elle a été suivie d'effet — la décision est enregistrée, puis vérifiée à la période suivante.

Un dossier de portefeuille résume la période : part du travail rattachée, part fantôme, nombre d'objectifs par état, coût total, part de RC de niveau A. C'est la première page d'une revue de direction, écrite toute seule.

## 14. Le toit du portefeuille

`laddition`, `problemes-caches`, `rayon-impact`, `preuve-a-l'appui` et `delegable-ou-pas` produisent déjà des nombres fiables, chacun dans son domaine. Vigie les consomme comme **sources de niveau A** :

| Objectif d'entreprise | RC | Source de niveau A |
|---|---|---|
| Réduire le coût de la dette | Coût en jours-homme sur 90 j | `laddition` |
| Baisser les incidents récurrents | Coût récurrent, nombre de foyers | `problemes-caches` |
| Livrer plus sûrement | Part de releases sans incident, taux de go/no-go fondés | `rayon-impact` |
| Améliorer la qualité | Part de critères d'acceptation prouvés | `preuve-a-l-appui` |
| Accélérer avec les agents | Part du travail délégable réellement déléguée, taux de reprise | `delegable-ou-pas` |
| Sécuriser le wiki | Foyers ouverts, exposition résiduelle | `placard-wiki` |

Conséquence : les onze apps déjà écrites cessent d'être onze outils isolés et deviennent **un système de mesure** dont Vigie est le toit. C'est aussi la réponse la plus solide au critère « impact potentiel » du jury : chaque objectif de la démo est mesuré par une app réelle, pas par un nombre tapé.

## 15. Le post-mortem d'objectif

À la clôture, une page générée : la cible, la valeur finale et sa source, le travail rattaché et ce qui a atterri, le coût réel, les signaux qui se sont déclenchés pendant la période, la décision de revue et son effet, et **ce qui est appris** — repris comme baseline de la période suivante. Les objectifs abandonnés ont le même post-mortem que les objectifs réussis : c'est là que se range la mémoire des abandons, et la raison pour laquelle la même erreur de ciblage ne se répète pas.

Écrire dans Confluence est un choix : aucune autre app du portefeuille n'écrit dans le wiki. Le dossier de revue et le post-mortem sont les deux endroits où Vigie le fait.

## 16. Époques et réorganisations

Une réorganisation au milieu du trimestre casse toutes les séries : les tickets changent de projet, les objectifs changent de propriétaire, le périmètre bouge. Comme dans `delegable-ou-pas`, l'app découpe le temps en **époques** :

- une époque s'ouvre sur un changement déclaré (équipe, périmètre, outil de mesure) ou détecté (déplacement massif de tickets) ;
- les séries et les projections ne mélangent jamais deux époques ;
- les chiffres de l'époque précédente restent visibles, grisés ;
- un objectif dont la cible change en cours de période garde les deux cibles, et l'ancienne n'est pas effacée.

## 17. Exigences fonctionnelles

**M** = indispensable pour la soumission, **S** = souhaitable, **C** = après le hackathon.

| N° | Exigence | P |
|---|---|---|
| VG-01 | Lire les objectifs depuis trois sources : graphe (`AtlassianGoal`, `AtlassianGoalUpdate`), registre local Jira, import tableur — et afficher la source active | M |
| VG-02 | Rattacher un ticket à un objectif avec raison écrite et fraction | M |
| VG-03 | Suggérer des rattachements candidats depuis le graphe, avec confiance | M |
| VG-04 | Détecter les douze signaux du § 7, seuils réglables, faits affichés | M |
| VG-05 | Qualifier chaque objectif d'un état, avec les signaux qui le fondent | M |
| VG-06 | Séries de RC avec niveau de source A/B/C par point | M |
| VG-07 | Recalculer les RC de niveau A depuis Jira/JSM/Bitbucket et depuis les apps du portefeuille | M |
| VG-08 | Mesurer le mouvement hebdomadaire du travail rattaché | M |
| VG-09 | Projection avec fourchette, effectif, hypothèses et « pas assez de recul » | M |
| VG-10 | Coût de l'intention avec méthode, part partagée et non-double-comptage du portefeuille | M |
| VG-11 | Degré de concordance (travail ↔ nombre) avec la liste des autres changements de la fenêtre | M |
| VG-12 | Vue verso : les fantômes, avec objectif plausible proposé et confiance | M |
| VG-13 | Pointage inversé : faits pré-remplis, interprétation humaine à côté | M |
| VG-14 | Dossier de revue généré, trois options chiffrées, décision enregistrée | M |
| VG-15 | Encart sur le ticket : « quel objectif sert ce ticket ? », fraction, ou « fantôme » | M |
| VG-16 | Carte du portefeuille (§ 19), gadget de tableau de bord | M |
| VG-17 | Outils MCP du § 18 | M |
| VG-18 | Agent Rovo « La vigie » et skill `at-quarterly-review` | M |
| VG-19 | Écran de couverture : source active, droits manquants, part du travail rattachée | M |
| VG-20 | Jeu de données d'exemple (un trimestre synthétique avec un objectif de chaque état) | M |
| VG-21 | Aucune statistique par personne, nulle part | M |
| VG-22 | Époques, et séries jamais mélangées entre époques | S |
| VG-23 | Post-mortem d'objectif généré dans Confluence | S |
| VG-24 | Champ personnalisé « Objectif » et fonctions JQL `goalOrphans()`, `goalLinked()` | S |
| VG-25 | Connecteur Teamwork Graph : objectifs et résultats gravés dans le graphe, mappés en work items externes avec relations (§ 20) | S |
| VG-26 | Détection de sous-calibrage et remontée automatique de la baseline proposée | S |
| VG-27 | Portefeuille multi-équipes, comparaisons anonymisées | C |
| VG-28 | Prévision de portefeuille (« à ce rythme, x % des objectifs seront tenus ») | C |
| VG-29 | Objectifs imbriqués (parent/enfant) avec roll-up sans double comptage | C |

## 18. Outils MCP, agent Rovo, skill

### Outils, exposés par `rovo:mcp`

| Clé | Verbe | Entrées | Retour |
|---|---|---|---|
| `get-objective` | GET | `objectiveId` | État, signaux et faits, série, projection, coût, décision |
| `list-objectives` | GET | `period?`, `team?`, `state?`, `limit` | Portefeuille résumé, part par état |
| `count-theatre` | GET | `period?` | Nombre d'objectifs par état, signaux dominants |
| `get-kr-series` | GET | `krId`, `from?`, `to?` | Points avec date, valeur, source, niveau |
| `get-projection` | GET | `objectiveId` | Pourcentage, fourchette, effectif, hypothèses, conclusion |
| `get-goal-cost` | GET | `objectiveId` | Jours, méthode, part partagée, ratio par point gagné |
| `list-goal-orphans` | GET | `projectKey?`, `limit` | Tickets fantômes, objectif plausible proposé, confiance |
| `get-concordance` | GET | `krId` | Concordance travail ↔ nombre, autres changements de la fenêtre |
| `get-review-dossier` | GET | `objectiveId` | Dossier de revue complet |
| `get-portfolio-brief` | GET | `period` | Première page d'une revue de direction |
| `link-work` | CREATE | `objectiveId`, `issueKeys`, `reason`, `fraction?` | Rattachement motivé |
| `record-kr-number` | CREATE | `krId`, `value`, `sourceRef`, `sourceLevel` | Point de série enregistré |
| `record-checkin` | CREATE | `objectiveId`, `interpretation` | Pointage avec faits pré-remplis |
| `record-decision` | CREATE | `objectiveId`, `decision`, `reason` | Décision de revue enregistrée |
| `open-postmortem` | CREATE | `objectiveId` | Page Confluence générée |

Aucun outil n'accepte un nom de personne en filtre, aucun n'en renvoie en sortie. Les outils de lecture sont des `GET` : une automatisation peut faire calculer le portefeuille à l'ouverture de la revue.

### Agent Rovo « La vigie »

Dans Rovo Chat :

- « Quels objectifs du trimestre sont décoratifs, et pourquoi ? »
- « Est-ce que "réduire les incidents de paiement" a bougé, et qu'est-ce qui a bougé en même temps ? »
- « Combien de jours a consommé cet objectif, pour quel mouvement ? »
- « Quels epics ne servent aucun objectif déclaré ? »
- « Prépare le dossier de revue de l'objectif X. »
- « Si on abandonne Y, quel travail devient orphelin ? »
- « Quelle part de nos résultats clés est mesurée plutôt que déclarée ? »

L'agent répond avec des faits, des fourchettes et des effectifs, cite la source de chaque nombre, et dit « pas assez de recul » quand c'est le cas.

### Skill `at-quarterly-review`

En `SKILL.md` : la conduite d'une revue de trimestre (lire les faits avant l'interprétation, ne jamais conclure sans effectif, enregistrer la décision, traiter les fantômes). Publiée en source ouverte, comme les autres skills de l'équipe, pour les agents tiers qui préparent des revues.

## 19. Écrans

La carte visuelle est une **carte marine** : chaque élément porte une donnée, rien n'est décoratif.

| Élément | Donnée encodée |
|---|---|
| Un **cap** | Un objectif ; son gisement = la cible chiffrée |
| La **route tracée** | Le travail rattaché (longueur = nombre de tickets, épaisseur = jours consommés) |
| Le **point** | La dernière mesure du RC, avec son niveau de source (A/B/C) |
| L'**écart de route** | L'écart entre projection et cible |
| Un **récif** | Un signal de théâtre (taille = gravité, forme = famille de signal) |
| Le **journal de bord** | Les pointages : faits d'un côté, interprétation de l'autre |
| Un **bateau fantôme** | Un ticket qui avance sans objectif |
| L'**ancre** | Un objectif mort-vivant, période close, jamais refermé |
| La **brume** | Le « pas assez de recul » : ce que l'app refuse de conclure est gris, pas coloré |
| Le **registre de bord** | La vue tableau — information identique, accessible, WCAG AA |

Écrans : 1. **Carte des caps** (`jira:globalPage`) · 2. **Fiche d'objectif** (état, signaux et faits, série, projection, coût, journal, décision) · 3. **Encart sur le ticket** (`jira:issuePanel`) · 4. **Gadget de tableau de bord** (compteur de théâtre de la période) · 5. **Page projet** (part du travail rattachée, fantômes) · 6. **Verso : les fantômes** · 7. **Dossier de revue et post-mortem** (pages Confluence générées) · 8. **Écran de couverture** (source active, droits manquants, part rattachée) · 9. **Réglages** (seuils des signaux, périodes, époques, sources de nombres, politique d'attribution).

## 20. Architecture Forge

Deux apps jumelles reliées par un pont signé — le motif déjà éprouvé dans `merge-avec-contexte` et `deja-vu-ci`, et ici une nécessité documentée : une app Forge peut appeler l'API du graphe **ou** fournir un connecteur, pas les deux (§ 22).

**App 1 — Vigie (Jira).** Tout le produit : écrans, calculs, MCP, agent, dossier de revue.

```yaml
# Esquisse, à valider avec forge lint
modules:
  rovo:mcp:                     # les 15 outils du § 18
  rovo:agent:                   # « La vigie »
  rovo:skill:                   # at-quarterly-review
  action:                       # une entrée par outil
  jira:globalPage:              # carte des caps, portefeuille, verso, couverture
  jira:issuePanel:              # quel objectif sert ce ticket
  jira:projectPage:             # alignement du projet
  jira:dashboardGadget:         # compteur de théâtre
  jira:customField:             # « Objectif », « Fraction »
  jira:jqlFunction:             # goalOrphans, goalLinked
  confluence:macro:             # dossier de revue, post-mortem, série d'un RC
  trigger:                      # issue créée/mise à jour, transition, commentaire
  scheduledTrigger:             # nuit : séries, mouvements, projections, coûts
  consumer:                     # recalcul long, jusqu'à 900 s
  webtrigger:                   # pont signé avec l'app connecteur
  sql:
  llm:                          # rattachements candidats, synthèse de dossier
permissions:
  scopes:                       # lecture Jira, écriture limitée, Confluence,
                                # read:graph:work-item, read:graph:project,
                                # read:graph:software-service, read:graph:commit
```

**App 2 — Le graveur (connecteur Teamwork Graph).** Pousse dans le graphe ce que la lecture seule ne donne pas : les objectifs du registre local, leurs résultats clés, leurs séries et les résultats de période. Conséquence : toute l'organisation peut demander à Rovo « qu'est-ce qui sert cet objectif ? » et croiser objectifs et livraison dans Atlassian Analytics. C'est la moitié « connecter des données **dans** le graphe » du bonus Teamwork Graph.

**Contrainte vérifiée** : le catalogue des types d'objet d'un connecteur est **fermé** (26 types : document, space, comment, work item, project, software service, commit, pull request, deployment, build, branch, repository, test*, customer organization, deal, feature flag, message, conversation, calendar event, design, video). Il n'existe **pas** de type `goal`, `objective` ni `key-result`. Le graveur mappe donc un objectif sur un **work item** (ou un **project**) externe, avec ses relations vers les issues Jira rattachées, et les RC comme champs de cet objet. Deuxième réserve vérifiée : tous les types d'objet connectés ne sont pas indexés dans Rovo Search et Chat — à tester sur work item avant de promettre la requête en langage naturel.

Règle stricte du graveur : n'écrire que des **agrégats** — objectif, résultat, période, coût en jours, état. Jamais de donnée personnelle, RH ou financière : l'ingestion de ces catégories est interdite par les conditions du graphe, et contraire au § 5.

### Trois adaptateurs de source d'objectifs

| Adaptateur | Condition | Ce qu'il donne |
|---|---|---|
| **Teamwork Graph** | Droits `read:graph` accordés ; l'organisation utilise Atlassian Goals | Lecture des objectifs natifs : types d'objet **`AtlassianGoal`** et **`AtlassianGoalUpdate`** (progrès déclarés), plus `AtlassianHomeComment` |
| **Registre local** | Toujours disponible, zéro licence | Un type de ticket Jira « Objectif » porte l'objectif ; les RC sont des champs ; les rattachements sont des liens |
| **Import** | Objectifs écrits dans un tableur ou une page | Import one-shot dans le registre local, avec provenance et date ; l'app ne prétend jamais synchroniser un tableur |

Le produit est identique sur les trois. L'écran de couverture dit lequel est actif et ce que l'app ne voit pas. C'est la garantie que la démo fonctionne sur le site des juges, quel que soit leur niveau de licence.

**Contrainte vérifiée** : il n'existe aucune API CRUD publique pour Atlassian Goals au moment de la rédaction — les objectifs natifs ne se lisent **que** par l'API du graphe, en Preview, avec des requêtes prêtes à l'emploi ou du Cypher persisté (le Cypher brut est refusé aux nouvelles apps). L'adaptateur registre local n'est donc pas un repli de confort : c'est la seule source sur laquelle l'app peut écrire.

### Ce qu'impose la plateforme

- Fonctions interactives 55 s ; le recalcul nocturne passe par `consumer` / déclencheur planifié (jusqu'à 900 s), par tranches avec curseur.
- Cinq déclencheurs planifiés au plus, un seul à 5 minutes.
- Lecture du graphe au nom d'un utilisateur connecté ; un droit manquant vide le résultat sans erreur → l'écran de couverture distingue « pas de droit » de « pas de données ».
- LLM hébergé pour les rattachements candidats et la synthèse de dossier seulement, avec cache ; jamais pour juger un pointage.
- Payload 5 Mo ; les écrans lisent depuis le cache SQL, pas en recalculant.

## 21. Modèle de données (Forge SQL)

| Table | Colonnes principales |
|---|---|
| `objective` | id, source, source_id, title, owner_ref, period_id, parent_id, state, theatre_state, scope_json, created_at, closed_at |
| `key_result` | id, objective_id, title, kind (number/binary), unit, direction, baseline, target, current, source_level, proof_type, falsifiable |
| `kr_point` | id, kr_id, value, measured_at, source_ref, source_level, computed_by, epoch_id |
| `objective_link` | id, objective_id, issue_id, fraction, reason, linked_by_ref, linked_at, verified_at, state |
| `movement` | issue_id, week, epoch_id, transitions, commits, closed, cycle_days, days_spent, days_source |
| `theatre_signal` | id, objective_id, signal, facts_json, threshold, fired_at, dismissed_reason, dismissed_until |
| `projection` | id, kr_id, computed_at, method, weeks_used, n, pct, ci_low, ci_high, conclusion, assumptions_json |
| `concordance` | id, kr_id, window_from, window_to, work_moved, number_moved, other_changes_json, degree, computed_at |
| `cost` | id, objective_id, period_id, days, method, shared_with_count, unattributed_days, computed_at |
| `checkin` | id, objective_id, at, facts_snapshot_json, interpretation, by_ref |
| `review_decision` | id, objective_id, decision, reason, at, by_ref, followed, verified_at |
| `orphan` | issue_id, detected_at, suggested_objective_id, confidence, reason, resolved_at |
| `epoch` | id, starts_at, ends_at, label, scope_change_json |
| `postmortem` | id, objective_id, page_ari, issued_at, moved, landed, learned_json |
| `coverage` | scope, source_active, rights_missing_json, work_linked_pct, kr_level_a_pct, computed_at |
| `graph_cursor` | object_type, last_id, last_run_at |

Aucune table ne contient de mesure par personne. `owner_ref` et `by_ref` servent à la responsabilité et à l'audit des décisions, jamais à un classement.

## 22. Contraintes vérifiées et points à valider

### Vérifié dans la documentation (11 novembre 2026)

- **Fonctions** : 25 s en standard, jusqu'à 900 s via `consumer`/déclencheur planifié ; 55 s pour web trigger, action et agent. Mémoire 512 Mo à 1 Go.
- **Déclencheurs planifiés** : 5 au plus par app, un seul à intervalle de 5 minutes ; événements asynchrones pour les traitements longs.
- **LLM hébergé** : Haiku (200K/64K), Sonnet et Opus (1M/128K), 100 invites/min par installation, 500K jetons/min par modèle.
- **Stockage** : SQL, KVS, Entity Store, Object Store (Preview) ; facturation à la consommation depuis le 1ᵉʳ janvier 2026.
- **Teamwork Graph** : lecture par GraphQL (requêtes prêtes à l'emploi ou Cypher persisté — **le Cypher brut est refusé aux nouvelles apps**), au nom d'un utilisateur, un droit par type d'objet, droit manquant = données omises sans erreur ; écriture par connecteur seulement. La liste publiée compte une soixantaine de types, dont **`AtlassianGoal`** (« un objectif dans la plateforme de suivi d'objectifs d'Atlassian ») et **`AtlassianGoalUpdate`** (« rapport de progression d'un objectif »), `AtlassianHomeComment`, `Project`(+`ProjectUpdate`), `Team`, `User`, `Group`, `AssetsObject`, ainsi que `work-item`, `software-service`, `commit`, `pull-request`, `deployment`, `document`, `space`, `customer-org`, `deal`, `test-*`, et les types `Focus*` (ex-Jira Align). **Aucun type `key-result` distinct.**
- **Connecteur** : catalogue d'objets **fermé**, 26 types, sans `goal`/`objective`/`key-result` ; tous les types connectés ne sont pas indexés par Rovo Search et Chat.
- **Exclusion mutuelle vérifiée** : « une app peut soit appeler l'API du Teamwork Graph, soit fournir un connecteur, pas les deux en même temps » — d'où les deux apps jumelles du § 20.
- **Ingestion dans le graphe interdite** : e-mails, agendas, enregistrements de réunion, données RH, financières ou de santé réglementées, catégories spéciales RGPD.
- **`rovo:mcp`** : Preview, un module par app, 50 outils au plus. **`rovo:agent`** : fenêtre d'exécution courte (~55 s), contrôle de sécurité d'Atlassian. **`rovo:skill`** : Preview.
- **Limites d'invocation** : 1 200/min par utilisateur, 7 000/min par installation ; 100 requêtes sortantes/min par runtime.

### À confirmer

La licence et la disponibilité produit d'**Atlassian Goals** (aucune page produit publique trouvée ; les URLs `atlassian.com/goals` renvoient 404 — le produit semble lié à Atlassian Home et au team directory) ; la présence de relations exploitables entre `AtlassianGoal` et les issues Jira ; l'API REST de **Jira Product Discovery** (chemins de documentation en 404 au moment de la vérification) ; les hôtes et scopes de `requestExternal` depuis Forge ; la liste exacte des catégories interdites à l'ingestion par un connecteur.

Note de méthode : le brief du hackathon annonce un graphe reliant « goals, work, people, decisions, and outcomes ». La documentation technique, elle, définit le Teamwork Graph comme la « couche de données unifiée » d'Atlassian, et les objectifs n'y existent que par les types `AtlassianGoal`/`AtlassianGoalUpdate`. La phrase du brief est citée comme du marketing, pas comme une spécification.

### À valider par un prototype la première semaine

| Point | Pourquoi | Solution de repli |
|---|---|---|
| Requête prête ou Cypher persisté sur `AtlassianGoal` + relations vers les issues | Adaptateur graphe | Registre local, import tableur |
| Droits `read:graph:*` accordés sur le site de démo | Rattachements candidats, mouvement, objectifs natifs | Mouvement lu dans Jira seul, écran de couverture |
| Mapping d'un objectif en `work item` externe côté connecteur, avec relations | App 2, bonus TWG | Connecteur limité aux résultats de période |
| Objets connectés réellement indexés par Rovo Search/Chat | La requête en langage naturel promise | Démontrer l'usage dans Analytics seulement |
| Volume : 500 objectifs × 6 semaines, temps de recalcul | Nuit de calcul | Tranches par équipe, curseur, calcul à la demande |
| Temps saisi réellement rempli chez un client typique | Coût de l'intention | Estimation, puis cycle time — la source retenue est affichée |
| Détection de rattachement hors périmètre (S7) | Signal décoratif | Repli sur composants et projets, sans le graphe |
| Écriture d'une page Confluence depuis une app Jira | Dossier de revue, post-mortem | Page générée dans l'app, export à la demande |

## 23. Exigences non fonctionnelles

- **Honnêteté.** Aucune projection sans fourchette ni effectif ; « pas assez de recul » s'affiche comme les autres conclusions ; aucun état sans les faits qui le fondent.
- **Pas un outil de flicage.** Aucune donnée par personne dans les écrans, exports, outils MCP ni agent. Les signaux portent sur le travail.
- **Vocabulaire tenu.** Déclaré / travaillé / avancé / concordant. « Prouvé » est réservé à une source de niveau A avec concordance, et jamais employé pour une causalité.
- **Explicabilité.** Chaque état liste ses signaux ; chaque signal montre son fait, son seuil et sa date ; chaque nombre montre sa source et son niveau.
- **Retenue.** L'app prépare les dossiers et les options ; elle ne referme, n'abandonne ni ne re-cible jamais un objectif seule.
- **Sobriété.** Calcul nocturne et cache ; LLM sur les rattachements candidats et la synthèse seulement ; budget affiché (objectifs calculés, appels, jetons, coût estimé).
- **Réversibilité.** Un dossier généré est une page Confluence modifiable ; un rattachement est détachable avec raison ; un signal écarté est réexaminé à date.
- **Vie privée.** Aucun agrégat nominatif poussé dans le graphe ; aucune catégorie interdite.
- **Rapidité.** Encart sur le ticket en moins de 2 s depuis le cache ; carte du portefeuille en moins de 5 s.
- **Robustesse.** Un droit manquant ou une licence absente dégrade le produit vers le registre local, jamais vers un résultat faux.
- **Accessibilité.** Registre équivalent à la carte marine, navigation clavier, WCAG AA, la brume n'est pas le seul codage du « pas assez de recul ».
- **Langues.** Interface en anglais et en français ; soumission en anglais.

## 24. Cas limites

- Deux RC en sens opposés, l'un en hausse l'autre en baisse : jamais de couleur unique ; les deux séries s'affichent, l'état tient compte du pire des deux.
- RC binaire (« livrer X ») : exige un type de preuve ; sans preuve, l'objectif reste « déclaré » même si le ticket est clos.
- Objectif atteint à 100 % en semaine 3 : sous-calibré (S8), avec la proposition de remontée de baseline pour la période suivante.
- Même cible reconduite trois trimestres : S9, affiché avec l'historique des cibles.
- Ticket servant trois objectifs : fraction par défaut 1/3, coût partagé, total du portefeuille non doublé.
- Réorganisation en milieu de période : nouvelle époque, séries coupées, chiffres anciens grisés mais visibles.
- Objectif abandonné : son travail devient fantôme et apparaît dans le verso, avec la raison de l'abandon.
- Nombre qui a bougé à cause d'un événement externe : la concordance liste les autres changements de la fenêtre ; le degré reste « concordant », jamais « prouvé ».
- Aucun temps saisi dans l'organisation : le coût bascule sur l'estimation puis le cycle time, avec la méthode affichée.
- Objectif de direction sans aucun epic : état orphelin, affiché à son propriétaire — pas diffusé, pas classé.
- Site sans licence Goals et sans droits sur le graphe : registre local, et l'écran de couverture dit exactement ce qui manque.
- Objectifs imbriqués : le roll-up ne compte jamais deux fois le même ticket.
- Période de vacances (deux semaines sans mouvement) : la projection exclut les semaines creuses déclarées, et le dit.
- Rattachement en masse corrigé ensuite : S1 reste visible dans l'historique, avec la date de correction.

## 25. Recette

1. Un objectif avec série de niveau A qui bouge et travail rattaché qui bouge est « vivant », avec les deux faits affichés.
2. Un objectif pointé trois fois pendant que ses tickets sont gelés depuis 30 jours est « narratif », avec S2 et S5 et leurs dates.
3. Cinq tickets rattachés le même jour par le même acteur déclenchent S1, fait visible.
4. Un RC sans source est de niveau C, et l'objectif ne peut pas dépasser « déclaré ».
5. Un RC de niveau A est recalculé, et sa valeur diffère de la dernière valeur recopiée : l'écart est affiché.
6. Une projection sur trois semaines de données affiche « pas assez de recul », sans pourcentage.
7. Une projection sur huit semaines affiche un pourcentage, une fourchette et un effectif.
8. Un ticket rattaché à trois objectifs compte pour un tiers dans chacun ; le total du portefeuille ne double pas.
9. Un epic qui avance sans objectif apparaît dans le verso avec un objectif plausible et une confiance.
10. Le pointage pré-rempli montre les faits **avant** le champ d'interprétation, et les deux restent visibles ensemble.
11. Une interprétation « en bonne voie » avec S2 et S4 actifs affiche les deux signaux à côté, sans censure.
12. Le dossier de revue contient les trois options chiffrées, et l'option « abandonner » liste le travail qui devient fantôme.
13. Une décision enregistrée est vérifiée à la période suivante : suivie d'effet ou non.
14. Un objectif mort-vivant (période close depuis 40 jours) porte une ancre et S11.
15. Une réorganisation ouvre une époque : les séries antérieures ne sont plus mélangées aux nouvelles.
16. Aucun écran, export, outil MCP ni réponse d'agent ne contient de statistique par personne (test automatisé).
17. Sans licence Goals ni droit sur le graphe, l'app bascule sur le registre local et l'écran de couverture le dit.
18. Un droit manquant sur le graphe apparaît à l'écran de couverture, au lieu d'un zéro silencieux.

## 26. Scénario de la vidéo (moins de 5 minutes, en anglais)

| Temps | Contenu |
|---|---|
| 0:00 – 0:25 | La revue de trimestre : sept objectifs, sept couleurs vertes. « Who typed these numbers? » |
| 0:25 – 0:55 | La carte des caps : le même portefeuille, avec les récifs. Trois objectifs décoratifs, un narratif, un mort-vivant |
| 0:55 – 1:30 | Une fiche : les signaux et leurs faits — cinq tickets rattachés le même jour, aucun commit depuis 30 jours |
| 1:30 – 2:00 | La source du nombre : un RC recalculé (niveau A) face à la valeur recopiée. L'écart |
| 2:00 – 2:30 | Le verso : les fantômes. 18 % du travail ne sert aucun objectif déclaré |
| 2:30 – 3:00 | Projection honnête : fourchette, effectif, et un « not enough data » assumé |
| 3:00 – 3:25 | Le coût de l'intention : 41 jours pour 3 points. Et le portefeuille sans double comptage |
| 3:25 – 3:50 | Le pointage inversé, puis le dossier de revue et ses trois options |
| 3:50 – 4:15 | Agent Rovo et MCP : « which goals are decorative this quarter, and why? » |
| 4:15 – 4:45 | Architecture : trois adaptateurs de source, deux apps jumelles, le connecteur qui grave les objectifs dans le graphe |

## 27. Comment les juges testeront

1. **Mode démonstration.** Un trimestre synthétique marqué comme tel : huit objectifs (un par état), 60 epics dont 12 fantômes, un rattachement en masse, un objectif sous-calibré, une réorganisation en milieu de période, des séries de niveau A calculées depuis de vraies données Jira semées.
2. **Carte des caps et registre.** États, signaux et faits, tri et filtres.
3. **Une fiche d'objectif de bout en bout.** Série, projection, coût, journal, dossier de revue, décision enregistrée.
4. **Agent Rovo.** Les sept questions du § 18.
5. **Client MCP.** `list-objectives`, `count-theatre`, `list-goal-orphans`, `get-projection` sur le trimestre de démo.
6. **Données réelles.** Sur un site où Atlassian Goals ou le graphe est disponible, l'écran de couverture guide les droits, puis le portefeuille se calcule.

Le lien d'installation et les identifiants de démo figurent dans la soumission ; la vidéo montre en plus un calcul réel sur un site relié à un dépôt.

## 28. Plan jusqu'au 22 décembre

| Semaine | Objectif |
|---|---|
| 11 – 17 nov. | Les huit validations du § 22 (API Goals, type `goal` dans le graphe, droits, connecteur) ; adaptateur registre local fonctionnel |
| 18 – 24 nov. | Rattachements, fractions, mouvements hebdomadaires, séries et niveaux de source |
| 25 nov. – 1ᵉʳ déc. | Les douze signaux, les sept états, le verso (fantômes), l'écran de couverture |
| 2 – 8 déc. | Projection, coût, concordance, pointage inversé, dossier de revue et décision |
| 9 – 15 déc. | Outils MCP, agent Rovo, skill, sources de niveau A depuis les apps du portefeuille ; **gel des fonctionnalités le 15** |
| 16 – 22 déc. | Recette, carte marine si le temps le permet, app connecteur, vidéo, instructions pour les juges, soumission, dépôt Marketplace |

Sacrifiables dans l'ordre : la carte marine (le registre porte la même information), l'app connecteur (le bonus TWG reste défendable par la consommation de l'API), le post-mortem Confluence.

## 29. Risques

| Risque | Parade |
|---|---|
| Pas d'API Goals en écriture, objectifs natifs lisibles seulement dans le graphe | Trois adaptateurs ; le registre local et l'import fonctionnent partout, y compris chez les juges |
| Type `goal` absent du catalogue du connecteur | Objectifs mappés en work items externes avec relations ; bonus TWG défendu par l'app 1 qui consomme `AtlassianGoal` |
| Lu comme un outil de contrôle des personnes | Aucune donnée individuelle, signaux sur le travail seulement, rappel dans l'interface, tests automatisés |
| États faux, donc perte de confiance | Chaque état montre ses faits et ses seuils ; seuils réglables ; signaux écartables avec raison et réexamen |
| Causalité sur-interprétée | Vocabulaire « concordant », liste systématique des autres changements de la fenêtre |
| Coût mal attribué | Fractions affichées, part non attribuée visible, méthode déclarée |
| Temps saisi absent | Trois sources de jours, hiérarchie explicite, jamais de mélange silencieux |
| Objectifs politiques intouchables | L'app s'adresse au propriétaire, affiche les faits, ne diffuse ni ne classe |
| Volume de calcul nocturne | Tranches, curseurs, cache, budget affiché |
| Bonus TWG non démontrable sans droits | Écran de couverture qui interroge le graphe en direct + app connecteur indépendante |

## 30. La vision poussée à l'extrême

- **La stratégie comme code.** Chaque intention de l'organisation a un propriétaire, une source de nombre, du travail rattaché, une projection et une date de révision. Ce qui n'a pas ces cinq choses n'existe pas — et c'est une information utile.
- **La fin des bilans rédigés.** Le dossier de trimestre s'écrit seul ; l'humain n'ajoute que l'interprétation et la décision. Une revue de direction passe de trois heures de présentation à quarante minutes d'arbitrage.
- **Les objectifs gravés dans le graphe.** Parce que le connecteur les écrit, n'importe qui dans l'organisation peut demander à Rovo « qu'est-ce qui sert cet objectif ? » et croiser objectifs, livraison, incidents et coûts dans Analytics.
- **La mémoire des cibles.** Les baselines, les échecs, les abandons et leurs raisons sont conservés : plus jamais une cible devinée, plus jamais la même cible reconduite par inertie.
- **Le détecteur de sous-calibrage comme politique.** Une cible atteinte trop tôt remonte la baseline proposée : les objectifs redeviennent difficiles, mécaniquement.
- **Le budget d'attention.** Le coût de l'intention, cumulé par époque, devient un bilan : combien de jours l'organisation a-t-elle mis derrière ses paroles, et sur quoi.
- **Le portefeuille d'apps devient un système.** `laddition`, `problemes-caches`, `rayon-impact`, `preuve-a-l-appui`, `delegable-ou-pas`, `placard-wiki` alimentent les RC de niveau A : une seule chaîne de mesure, de la dette au résultat clé.
- **La détection de l'intention morte.** À terme, l'app signale aussi les objectifs qui *devraient* exister : du travail répété, coûteux, sans intention déclarée — un objectif fantôme à écrire.

## 31. Liens avec les autres cahiers des charges

- **Le coût réel de la dette (`laddition`)** : même discipline des chiffres (fourchette, méthode affichée, preuve derrière chaque nombre) ; sa mesure devient un RC de niveau A.
- **Rayon d'impact (`rayon-impact`)** : il juge une release, Vigie juge une période ; son taux de releases sans incident alimente un RC.
- **Fait, preuve à l'appui (`preuve-a-l-appui`)** : sa grille de force de preuve (machine / attestée / déclarée) est reprise pour les RC binaires et pour les niveaux A/B/C.
- **Délégable ou pas (`delegable-ou-pas`)** : mêmes époques, mêmes intervalles de confiance, même refus de conclure sous le seuil, même table de décisions enregistrées ; sa part délégable alimente un RC.
- **Problèmes cachés (`problemes-caches`)** : le coût récurrent des incidents devient un RC de niveau A.
- **Chantiers en collision (`chantiers-en-collision`)** : un orchestrateur croise « travail prêt sans collision » et « travail servant un objectif prioritaire ».
- **Permis d'agir (`permis-forge`)** : un agent qui rattache du travail ou dépose un point de série le fait sous permis.
- **Brief de contexte (`brief-forge`)** : le brief d'un ticket peut inclure l'objectif qu'il sert et son état.
- **Placard du wiki (`placard-wiki`)** : ses foyers ouverts et son exposition résiduelle alimentent un RC de sécurité ; les deux apps écrivent leurs bilans dans Confluence.

## 32. Sources

- [Codegeist 2026](https://codegeist2026.devpost.com/) et ses [ressources](https://codegeist2026.devpost.com/resources)
- [Teamwork Graph : présentation et exclusion API/connecteur](https://developer.atlassian.com/platform/teamwork-graph/) · [API](https://developer.atlassian.com/platform/teamwork-graph/call-the-teamwork-graph-api/) · [types d'objet, dont `AtlassianGoal` et `AtlassianGoalUpdate`](https://developer.atlassian.com/platform/teamwork-graph/api-reference/object-types/overview/) · [catalogue fermé des types d'un connecteur](https://developer.atlassian.com/platform/teamwork-graph/connector-reference/object-types-connectors/overview/) · [relations](https://developer.atlassian.com/platform/teamwork-graph/api-reference/relationship-types/overview/)
- [Modules du manifeste Forge](https://developer.atlassian.com/platform/forge/manifest-reference/modules/) · [limites d'exécution](https://developer.atlassian.com/platform/forge/limits-invocation/) · [LLM hébergé](https://developer.atlassian.com/platform/forge/ai/) · [stockage](https://developer.atlassian.com/platform/forge/storage-api/)
- [Modules Rovo](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/) · [`rovo:mcp`](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-mcp/) · [`rovo:skill`](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-skill/)
- [API Jira Cloud](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) · [API Confluence Cloud](https://developer.atlassian.com/cloud/confluence/rest/intro/) · [permissions Forge](https://developer.atlassian.com/platform/forge/manifest-reference/permissions/)
- [Publication d'une app Forge au Marketplace](https://developer.atlassian.com/platform/marketplace/listing-forge-apps/)
- Rapports internes : `inventaire-codegeist/A-github.md`, `B-encours.md`, `D-marche-forge.md`, `E-verif-goals.md`

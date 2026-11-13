---
name: at-quarterly-review
description: >-
  Conduire une revue de trimestre sur des objectifs réels : lire les faits avant
  l'interprétation, ne jamais conclure sans effectif, enregistrer la décision,
  traiter les fantômes. Publiée en source ouverte pour les agents tiers qui
  préparent des revues (SPEC §18).
---

# Skill — Conduire une revue de trimestre

Ce skill décrit la discipline d'une revue de trimestre fondée sur des faits,
telle que Vigie la prépare. Il est utile à tout agent ou humain qui anime une
revue d'objectifs.

## Principe

Une revue ne sert pas à entendre des récits : elle sert à **arbitrer** à partir
de faits. L'ordre est imposé : les faits d'abord, l'interprétation ensuite, la
décision pour finir — et la décision est enregistrée puis vérifiée à la période
suivante.

## Déroulé

1. **Ouvrir sur le portefeuille, pas sur un objectif.**
   Lis la première page (`get-portfolio-brief`) : part du travail rattachée,
   part fantôme, nombre d'objectifs par état, coût total, part de résultats clés
   de niveau A. C'est le cadrage.

2. **Lire les faits avant toute interprétation.**
   Pour chaque objectif à l'ordre du jour, lis l'état et les signaux **avec leurs
   faits et leurs seuils** (`get-objective`). Ne laisse personne commencer par
   « on est en bonne voie » : regarde d'abord le mouvement du travail, la série
   et son niveau de source, la projection et sa fourchette.

3. **Ne jamais conclure sans effectif.**
   Une projection sans fourchette ni effectif n'est pas une projection. Si la
   réponse est « pas assez de recul », c'est une réponse complète : note-la
   comme telle, ne la transforme pas en pourcentage.

4. **Traiter les états de théâtre, sans procès d'intention.**
   - *narratif* (S5+S2) : des pointages, pas de chantier → demander le travail,
     pas un meilleur récit.
   - *décoratif* (S1/S7) : rattachement de façade → faire motiver ou détacher.
   - *travaillé-muet* (S6/S4) : le travail bouge, le nombre non → la mesure
     est-elle faillable ? est-ce le bon nombre ?
   - *orphelin* (S0) : aucun travail rattaché → l'objectif est-il réel ?
   - *sous-calibré* (S8/S9) : cible atteinte trop tôt ou reconduite → remonter
     la baseline.
   - *mort-vivant* (S11) : période close, objectif jamais refermé → clore.

5. **Traiter les fantômes (le verso).**
   Liste le travail qui avance sans objectif déclaré (`list-goal-orphans`). Pour
   chacun : soit il sert un objectif existant (le rattacher, avec une raison),
   soit il révèle un objectif qui devrait exister (l'écrire). C'est la stratégie
   réellement exécutée.

6. **Préparer les trois options chiffrées** (`get-review-dossier`) :
   continuer tel quel, re-cibler (avec la cible que le rythme rend crédible),
   abandonner (en listant le travail qui devient fantôme). Chiffrer chaque
   option en jours.

7. **Enregistrer la décision** (`record-decision`) : choix, raison, date. La
   décision est humaine ; l'app ne referme, n'abandonne ni ne re-cible jamais
   seule. Elle sera **vérifiée à la période suivante** (suivie d'effet ou non).

8. **Clore par un post-mortem** (`open-postmortem`) pour les objectifs terminés
   ou abandonnés : le nombre a-t-il bougé, le travail a-t-il atterri, qu'est-ce
   qu'on en retient. Les abandons ont le même post-mortem que les réussites :
   c'est la mémoire qui évite de répéter la même erreur de ciblage.

## Interdits (rappel)

- Aucune statistique par personne, aucun classement individuel : la revue porte
  sur le **travail** et les **objectifs**, pas sur les gens.
- Aucune couleur globale par objectif : un RC en baisse et un RC en hausse ne se
  compensent pas.
- Aucune causalité affirmée : dire « concordant », et lister ce qui d'autre a
  changé dans la fenêtre.

## Référence

Vigie — real goals · Codegeist 2026. Ce skill est publié en source ouverte,
comme les autres skills de l'équipe, pour les agents tiers qui préparent des
revues de trimestre.

# Vigie — real goals

**Codegeist 2026 · Apps for Business Teams**
Repo: https://github.com/BaptisteFaisy/vigie · Live demo: https://baptistefaisy.github.io/vigie/

> An objective is real only if work is attached to it **and** the number that
> measures it moved in a way traceable to that work.

## The one-line pitch

Vigie links goals to epics, recomputes movement every week, tells you whether the
target is reachable and what it costs in days — and plainly names **goal theatre**:
objectives that look alive and are not.

## The problem

Objectives are written at the start of the quarter and read again at the end. In
between they live in a spreadsheet nobody opens. Three drifts, always the same:

1. **Decoration.** The objective exists, fifteen tickets are "linked", the
   check-in says "on track". Nothing measurable moved. The linking is decorative.
2. **Narrative without work.** The objective is checked in weekly with rich
   sentences while its epics are frozen. The visible activity is the comment's.
3. **Work without an objective.** Epics move that serve no declared objective.
   Nobody sees it, because nobody looks in that direction.

And underneath: **the key-result number is typed by hand.** Once a quarter,
someone copies a figure into a cell. The real figure already exists — in Jira, in
JSM incidents, in deployments, in quantified debt. Nobody connects the two. So
management asks "where do we stand?" and receives a colour. A green, red or
orange colour, chosen by the person with the most interest in it being green.

## The solution

Vigie separates the four meanings of "the objective is moving":

| Degree | What it takes |
|---|---|
| **declared** | someone wrote "on track" |
| **worked** | attached work moved (transitions, commits, closures) |
| **advanced** | the key-result series moved in the expected direction, from an A or B source |
| **concordant** | advanced **and** work movement precedes number movement, same scope |

It qualifies every objective into one of seven **theatre states** (alive,
narrative, mute-worker, decorative, orphan, under-calibrated, zombie) from
**thirteen signals**, each a dated, measurable fact with an adjustable threshold.
Nothing is asserted without the fact behind it.

The number's **source level** is the centrepiece: **A** (computed by the app from
Atlassian data and from the portfolio's sister apps), **B** (entered with a
verifiable reference), **C** (declared, no source). A level-A key result is
**recomputed, never copied** — and when the recomputed value differs from the
hand-typed one, Vigie shows the gap. An objective whose key results are all level
C can never rise above "declared".

Projections are honest: a range, a sample size, visible assumptions, and one
conclusion — *reachable / reachable with conditions / not reachable at the current
pace / not enough data*. Under 4 weeks of data or 5 attached tickets, "not enough
data" **is** the answer, displayed like any other.

The **cost of intention** counts days from three sources in order of preference
(logged → estimated → cycle time), shares them by attachment fraction (a ticket
on three objectives counts a third in each; the portfolio total never doubles),
and shows the ratio of days per point gained — with a range.

And the **other side**: the ghosts. Epics and tickets that move, consume days,
and serve no declared objective. For each, Vigie proposes a plausible objective
with a confidence — and says "not enough data" when it cannot. It is the most
useful screen in the product: it reveals the strategy actually executed, against
the strategy declared.

## What Vigie never does

It rates **no one** (no per-person statistic, no ranking — structurally enforced:
the Jira adapter never even reads the assignee, and a guard fails the build if any
query aggregates by identity). It decides **nothing** (it prepares the dossier;
the decision is human and recorded, then verified next period). It invents **no
causality** ("concordant", never "caused by"; the window's other changes are always
listed). It greens **nothing** (no overall colour; a falling and a rising key
result do not offset). It concludes **without a sample** never.

## How it is built

Two twin Forge apps, because a Forge app can either call the Teamwork Graph API
or provide a connector — not both:

- **App 1 — Vigie (Jira)**: the whole product. Reads native goals
  (`AtlassianGoal` / `AtlassianGoalUpdate`) from the Teamwork Graph when rights
  allow, else a local Jira register, else a spreadsheet import. 15 MCP tools, the
  Rovo agent "La vigie", the `at-quarterly-review` skill, nine screens.
- **App 2 — The engraver**: a Teamwork Graph **connector** that writes objectives
  into the graph as external work items (the connector object catalogue is closed
  — there is no `goal` type), aggregates only, over a signed bridge.

The portfolio's eleven sister apps (`laddition`, `problemes-caches`,
`rayon-impact`, `preuve-a-l-appui`, `delegable-ou-pas`, `placard-wiki`, …) feed
level-A key results: Vigie is the roof that turns them into one measurement
system.

## Impact

Every objective in the demo is measured by a real app, not by a typed number.
The quarterly review stops being three hours of presentation and becomes forty
minutes of arbitration: the dossier writes itself, the human adds only the
interpretation and the decision.

## Try it

- **Live demo** (no install): https://baptistefaisy.github.io/vigie/ — the real
  engines are bundled and run **in your browser**. Change a threshold, record a
  check-in, call any of the 15 MCP tools: it is really recomputed.
- **On a live Jira Cloud site** (shipped and published): **8 epics as objectives,
  177 real tickets, 150 real ghosts**. Real findings — only 15.3 % of the work is
  attached to an objective, 84.7 % is ghost work; 7 objectives are dormant
  (frozen work, flat series, nobody writes a check-in); the cost is 0 days
  because nobody logs time — the §11 cascade says so instead of inventing a
  number.
- **On real GitHub data**: a real portfolio imported from `godotengine/godot` — 6
  objectives, 3 982 tickets, **238 real ghosts**. Milestone `3.7` is declared
  83.2 % delivered while the recompute says 71.1 % (the platform's count
  includes pull requests — *that* is the gap nobody had looked at).
- **On a synthetic quarter** (`npm run build:site`): 8 objectives covering **all
  seven** theatre states, a bulk attachment, an under-calibrated target, a
  mid-period reorganisation — pedagogically complete, which a real repository
  rarely is.
- **Rovo**: "Which objectives this quarter are decorative, and why?"
- **MCP**: `list-objectives`, `count-theatre`, `list-goal-orphans`, `get-projection`.
- **Tests**: 133 passing; the spec's 18-item acceptance recipe is covered, and the
  site lists, for each item, the exact file that proves it.

## Licence

MIT.
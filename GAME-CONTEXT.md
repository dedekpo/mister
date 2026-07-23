# GAME-CONTEXT.md

Context document for AI agents working on this project. This describes the game's vision, design pillars, and constraints. The design is in a very early stage and will iterate over time — treat everything here as current direction, not final spec.

Companion docs: [DESIGN-V1.md](DESIGN-V1.md) (concrete design of the first prototype — the beat loop, cards, resolution) and [PROTOTYPE-PLAN.md](PROTOTYPE-PLAN.md) (step-by-step implementation milestones).

## What the game is

A **football (soccer) card game** where the player controls their team during a live match by playing cards.

- The match plays out in **real time**, but **pauses whenever the player must decide** which card to play (pause-and-play hybrid, not strictly turn-based).
- Cards represent **actions**: pass, dribble, sprint forward, tackle, shoot, etc.
- Later, **stat-boost / effect cards** will be added, e.g. "Increase chances of X by Y%" or conditional effects like "If losing the game, every action gets +X% chance of succeeding."
- Matches are **11 v 11** rendered in a 3D scene.
- Around the match sits a **management / roguelike layer**: winning matches and tournaments, building the best squad, training choices, player hiring, and drawing/earning the cards you bring into matches.

## Essential experience (design north star)

The player should feel:

1. **The excitement and adrenaline of playing a football match** like a professional player would.
2. **The strategic satisfaction of being the coach/manager** — decisions before and during the match that factually determine how the match plays out, instead of relying on an opaque AI simulation.

**Theme:** Becoming the best team in the tournament through strategic choices before and during football matches.

**Problem statement:** How can I design a good single-player experience of a real football match using cards in a roguelike style? How can I convert this into a proper 3D match engine? Will players find it fun or too boring?

## Why this game exists (designer motivation)

- Genuine passion for football: childhood/teenage matches, the "this coach is stupid, he should've done X instead!" feeling while watching games, and years playing Brasfoot and Football Manager trying to build the best team.
- The desire for a football manager that is **actually fun and actionable during the match** — strategic choices that are factual and fast-paced, not delegated to a simulation engine.
- "I would love if this game existed."

## Core loop and goals

- **Micro goal (match):** score more goals than the opponent by playing the right cards at the right moments.
- **Macro goal (run):** win the tournament.
- **Narrative frame:** you've just been hired as the manager of a mid-level football team; make it a successful championship team while keeping the budget healthy.
- **Meta systems:** winning matches earns president respect, fan support, and squad morale. Between matches: card drafting/drawing, training choices, player hiring — a medium-complexity management system that generates the cards used in real-time matches.

## Elemental tetrad

### Mechanics
- Real-time match with pause-to-decide card play; every in-match action is a card.
- Action cards (pass, dribble, sprint, tackle…) plus stat/effect cards.
- Core player verbs: play a card, draw, choose training, hire players.
- Roguelike structure around a tournament run.

### Story
- Light, emergent framing: new manager of a mid-level team, build it into a champion on a healthy budget.

### Aesthetics
- Style direction still open: pixelized, stylized, or flat. Reference: "eye of the match" or stylized look.

### Technology
- **Three.js + React Three Fiber + TypeScript**, with an **ECS architecture** for the match engine.
- Main tech risk: performance, if the match engine or management simulation becomes too CPU-heavy.

## Target audience & market

- 20–35 year old males, football fans, Steam players.
- **Comparable:** NUTMEG — the closest existing game, but it's just cards on a 2D board with pre-defined steps; it sold ~$50k with a simpler version. There is currently **no football card game with an interactive 3D match engine** — that's the hook.
- Solo developer with hand-made assets; scoped to be viable for one person.

## Key risks (validate in order)

1. **Fun risk:** Is a card-driven football match fun, or boring? Validate the core match loop first — roguelike + football needs validation.
2. **Tech risk:** The 3D match engine is hard — validate it early before investing in the management layer.
3. **Scope risk:** The management layer could be time-consuming, especially testing and bug fixing.

## Working principles for this project

- **Prototype the toy before the game:** the core card-play match interaction must be fun to fiddle with even without goals or meta systems.
- **Iterate fast:** quick-and-dirty prototypes, fast loops, invest in tooling (hot reload, cheat menus, debug skips).
- **Meaningful choices:** at each card decision, options should be genuinely different and matter; watch for dominant strategies.
- **Juicy feedback:** every card played should feel satisfying — clear interaction loop of intent → input → game response → feedback.
- **Cut scope by default:** elegance means each element serves multiple purposes.
- **Re-check the essential experience regularly:** does the current build deliver the "player adrenaline + coach strategy" feeling?

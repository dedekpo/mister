# DESIGN-V1 — The Beat Loop Prototype

Concrete design target for the first playable prototype. This is a strawman to validate the riskiest question: **is the pause-and-play card match fun?** Everything here is subject to change after playtesting. See [GAME-CONTEXT.md](GAME-CONTEXT.md) for the overall vision.

## The beat loop (core of the game)

The match runs in **accelerated real time** (FIFA/PES-style clock — a match is ~10–15 real minutes). The game **auto-pauses** (fade + slow motion) at **decision points**:

- A player on your team receives the ball.
- Possession changes.
- The opponent enters a dangerous zone (your defensive third).
- Set pieces (v1: only kickoff and goal kick; corners/throw-ins resolved automatically).

During a pause the player can:

1. **Play a card** from their hand (4–5 cards), with a **spatial target** — drag the cross to its landing point, drag the through-ball into a channel, pick the receiving teammate.
2. **Issue movement orders** to off-ball players (click player → click spot). Capped at **2 per pause** in v1.
3. Or take a **free basic action** (see below).

Confirm → the play **resolves live for 3–8 seconds** → next decision point.

> Rhythm: decide ~5s, watch ~5s, repeat. A "play" is the atomic unit of the game. A full match is roughly 40–60 decisions.

## What cards are

**Basic verbs are always free but mediocre — cards are moments of brilliance.**

- At any decision point the ball carrier can always do a *safe short pass*, *dribble a direction*, *hold*, *shoot*, or *clear* — modest success rates driven by player stats. This prevents the degenerate "no card = player stands there" situation.
- **Cards are the exceptional versions**: *Killer Through Ball* (breaks the defensive line, bonus if the receiver is a winger), *Overlap Run* (fullback sprints beyond the winger), *Long Switch*, *Rainbow Flick* (high risk dribble), *Low Cross*, *Offside Trap*, *Crunching Tackle*, *Press Trap* (paint a zone; if the ball enters it, nearby players collapse on it).
- Defense works the same way: on opponent decision points you play defensive cards and reposition.
- Your deck defines **what kind of brilliance your team is capable of** — this is where the roguelike deckbuilding will live (out of scope for v1 beyond a fixed starter deck).
- Draw rule (v1 strawman): **draw 1 card after each play**, hand cap 5.

## Resolution

Dice + stats. Every action has a **success chance** computed from:

- the acting player's attributes,
- the situation: distance, defensive pressure, angle, receiver positioning.

The chance is **shown to the player while targeting** (e.g. "62%"). A roll branches the outcome: completed / intercepted / deflected / loose ball. Stat-boost and conditional cards ("if losing, all actions +X%") plug in as **modifiers on these rolls**.

## Player control model

**AI positions everyone by role + match state as the baseline; the player intervenes at decision points.** The player is the coach, not all 11 players:

- Off-ball players follow formation/role positioning automatically (already implemented).
- Interventions = cards + capped movement orders at pauses.
- "Full control" vs "AI + light interventions" is a tuning knob (order cap), not a separate architecture — both poles can be playtested with one build.

## Example: ~30 seconds of play

> Your volante wins the ball — auto-pause, slow-mo fade. Hand: Long Switch, Overlap Run, Sprint Forward, Killer Through Ball, Offside Trap. The opponent is stretched from their attack. You play **Sprint Forward** on your ponta (he darts up the right touchline), then the **free safe pass** to your meia. Resolve — pass completes, play flows. Meia receives at midfield — pause. You play **Killer Through Ball**, dragging the target into the gap behind their left back, right where your ponta is arriving. 62% shown. Resolve — it comes off. Ponta is in the box — pause. Shoot (free, 35%) or **Low Cross** dragged to the penalty spot where your striker lurks? You drag the cross...

## Open design levers (decide via playtest, not upfront)

- Movement order cap per pause (v1: 2).
- Card draw cadence (per play vs per possession).
- Full pause vs 10% slow-motion during decisions.
- Which events trigger decision points (too many = sluggish, too few = spectator).
- Whether a limited manual-pause resource ("timeouts") exists.
- Standing team instructions (high line, press triggers) — candidate for v2, they make the AI baseline feel like *your* team.

## Explicitly out of scope for v1

- Management layer (training, hiring, budget, morale), deckbuilding/roguelike run structure.
- Art, sound, animations beyond capsule movement and basic feedback.
- Full football rules: offside, fouls, corners, throw-in decisions (out of bounds auto-resolves to nearest player).
- Multiplayer of any kind. Second half / substitutions.

## Success criteria for the prototype

A fresh player plays one half (~5–7 min) and:

1. Understands the loop without explanation after 2–3 plays.
2. Feels tension when dragging a target and watching the resolution.
3. Wants to play a second half. ("Toy question": is the core fun in the first 60 seconds?)

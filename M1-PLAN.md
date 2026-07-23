# M1-PLAN — The Braindead Match, in Detail

Detailed implementation plan for milestone M1 of [PROTOTYPE-PLAN.md](PROTOTYPE-PLAN.md): 22 AI capsules play a watchable, autonomous football match with zero input. This document supersedes the M1 section of that file. It is written for a 2-year-horizon, craft-first codebase: every step must leave the code exemplary per [R3F-GAME-CODEBASE-RULES.md](R3F-GAME-CODEBASE-RULES.md), and every step is sized for one focused dev session ending in something observable.

---

## Part 1 — Meeting minutes: decisions and dissents

The plan below came out of debating five perspectives: simulation engineer, ECS architect, football domain designer, tools/QA engineer, and tech lead/scope skeptic. These are the load-bearing decisions.

### D1. Ball flight is parametric, and outcomes are pre-resolved at kick time

**Decision:** A kicked ball travels a parametric path (origin → destination, duration from distance/speed, parabolic height for lofted balls). Whether the pass completes, gets intercepted, or a shot becomes goal/save/miss is **rolled once, at the moment of the kick**, using the seeded RNG. The flight then simply plays out the pre-decided outcome: an intercepted pass's destination becomes the interception point, the interceptor is assigned to arrive there.

**Rationale:** This is the single most important architectural alignment in M1. In M3, actions resolve as *dice roll at commit time, then the world displays the result* — the beat loop's "watch the play resolve" phase is a playback of a decided outcome. Building M1 the same way means M3 swaps the chance formula, not the architecture. It is also fully deterministic and keeps `ballFlightSystem` a dumb mover with no gameplay logic.

**Dissent (simulation engineer):** per-tick emergent interception (defenders react to the live ball) looks more organic, since players keep moving during flight. Overruled: emergent resolution fights the dice model M3 needs, is harder to make deterministic, and its visual advantage is recovered by making the interceptor *run to* the interception point.

### D2. Ball state is three phase tags; the carrier link is an exclusive relation

**Decision:** The ball is always in exactly one phase: `BallCarried`, `BallInFlight`, or `BallLoose` (Rule 15). The carrier link is a koota relation `CarriedBy` (ball → player, exclusive) per Rule 20. Each phase has exactly one system that writes ball `Position`: `ballCarrySystem`, `ballFlightSystem`, `looseBallSystem` (Rule 9).

### D3. Carrier decisions run on a think-timer with a replaceable "chooser" seam

**Decision:** When a player claims the ball they get a `CarrierDecision` think-timer (~0.4–0.9s, seeded jitter). On expiry, the brain: generates candidate actions → scores each (pure functions in `core/ai/`) → picks argmax with seeded noise → executes via actions. The *generate/score* half and the *pick* half are deliberately separate functions.

**Rationale:** The generate+score half is permanent — M2 reuses it to show the player their options, M3 turns scores into displayed percentages. Only *pick* differs: AI argmax today, human input at decision points in M2. The think-timer is literally the M2 pause hook: for the human team, M2 replaces "timer expires → AI picks" with "timer expires → pause and wait."

### D4. Off-ball positioning stays with `positioningSystem`; ball duties are tags that opt players out

**Decision:** `positioningSystem` remains the owner of `TargetPosition` for every player **without** a ball duty. Players tagged `IsCarrier`, `IsReceiver`, or `IsChaser` are skipped by it and steered by `ballDutyMovementSystem` instead. Duty assignment (who chases a loose ball, who receives a pass) lives in `ballDutySystem`, recomputed on ball-state changes rather than every tick. Ownership stays exclusive by partitioning on tags — the Rule 9 table extends cleanly, and the formation code we already trust is untouched.

### D5. Goalkeepers are pre-resolution puppets in M1

**Decision:** Shots pre-resolve to goal / saved / off-target at kick time (D1). "Saved" hands the ball to the GK as carrier; the GK brain then just distributes (short pass to the most open defender). No reactive dive AI, no shot-stopping simulation. Off-target becomes a goal kick (crude restart).

**Rationale (football designer):** at capsule fidelity, a GK who ends up holding the ball after a save *reads* correctly. Reactive GK AI is a rabbit hole with near-zero M1 payoff. Revisit at M3 when saves need stats.

### D6. Kickoff resets reposition — they do not respawn

**Decision:** Refactor `setupKickoff` into `spawnMatch` (creates the 23 entities, once) and `resetForKickoff` (repositions existing entities, gives the ball to a kickoff carrier). Goals and halves call the reset only.

**Rationale:** entity churn discards future per-player state (stats, cards, stamina) and fights koota's lifecycle model. The current destroy-everything version was scaffolding; M1 is when it gets its real shape.

### D7. Seeded RNG and a headless match harness are M1 work, not "later"

**Decision:** Build `core/random.ts` (mulberry32-style, state stored in a `MatchRandom` world trait) in the first step, and add **vitest** with it. Late in M1, add `simulateMatch(seed, ticks)` — the whole sim already runs headless per Rule 22 — and a statistical sanity suite: run N seeded matches, assert goals-per-match, possession balance, and pass-completion land in believable bands, plus a determinism test (same seed twice → identical final state).

**Rationale (tools engineer, unanimous):** the engineer cannot watch matches (designer playtests in-browser); the harness is how the engineer *knows* a change didn't produce 0-0-forever or 15-14 chaos. It converts "believability" from vibes into regression-testable numbers. This is the clearest place where the 2-year-craft argument buys something real.

### D8. Scope-skeptic cuts (things that shall not pass into M1)

No behavior trees, no pathfinding/navmesh (straight-line movement is fine on an open pitch), no fouls, no offside, no corners/throw-in choreography (all out-of-bounds collapse to two crude restarts), no stamina, no per-player stat variation (uniform attributes until M3), no headers, no first-touch failure, no animations/sound, no side-swap at halftime, no substitutions. Every one of these is either M3+ or pure polish; each has a believability workaround noted in the steps.

### Open questions for the designer

1. **Viewing length:** how long should one half take in real minutes for M1 watching sessions? (Plan assumes ~4.5 real minutes: 45 match-minutes at 10× clock scale.)
2. **Believability bands:** what goals-per-match range should the harness enforce? (Plan assumes 2–6 total.)
3. **Symmetric teams:** M1 gives both teams identical tuning and uniform players — pure mirror match. OK, or do you want slight asymmetry for watchability?
4. **Pre-resolved shots:** comfortable that goal/save/miss is decided at the moment of the shot (GK reaction purely cosmetic) until M3 adds stats?

---

## Part 2 — Target architecture

### Ball state machine

```
            kickBall (pass/clear/shot)
  Carried ─────────────────────────────► InFlight
     ▲                                       │ flight completes
     │ claimBall (within CLAIM_RADIUS)       ▼
     └──────────────── Loose ◄──── deflection / no claimant at arrival
                        │  ▲
                        └──┘ rolls with friction until claimed / out of bounds
```

### New traits

| Trait | Kind | Fields | Lives on |
| --- | --- | --- | --- |
| `BallCarried` / `BallInFlight` / `BallLoose` | phase tags | — | ball |
| `CarriedBy` | relation, exclusive | — | ball → player |
| `BallFlight` | data | `fromX, fromZ, toX, toZ, elapsedSeconds, durationSeconds, arcHeight` | ball |
| `FlightResolution` | data | `claimant: Entity, kind: 'received' \| 'intercepted' \| 'goal' \| 'saved' \| 'offTarget'` | ball (during flight) |
| `BallRoll` | data | `vx, vz` | ball (while loose) |
| `IsCarrier` / `IsReceiver` / `IsChaser` | duty tags | — | players |
| `CarrierDecision` | data | `remainingSeconds` | carrier |
| `LastPassFrom` | data | `passer: Entity` | carrier (anti-ping-pong memory) |
| `MatchRandom` | world singleton | `state` | world |
| `MatchClock` | world singleton | `matchSeconds, isRunning` | world |
| `Score` | world singleton | `home, away` | world |
| `MatchPhase` | world singleton | `phase: 'kickoff' \| 'playing' \| 'halfTime' \| 'fullTime'` | world |
| `MatchStats` | world singleton | pass/shot/interception/OOB counters per side | world |

### Event catalog (Rule 12/13 — every event answers emitter / consumer / drain)

| Event | Emitted by | Consumed in | Notes |
| --- | --- | --- | --- |
| `PassKicked { kicker, toX, toZ, flavor }` | `kickPass` action | `statsPhase` | later: sound/VFX bridges |
| `PassResolved { kind: 'completed' \| 'intercepted' }` | claim logic on arrival | `statsPhase` | |
| `ShotTaken { shooter, outcome }` | `kickShot` action | `statsPhase` | |
| `GoalScored { side }` | flight completion of a `goal` resolution | `gameplayEventPhase` | increments `Score`, triggers `resetForKickoff` |
| `PossessionChanged { side }` | `claimBall` action | `gameplayEventPhase` | flips `Possession`; formation shape reacts for free |
| `BallWentOut { restart: 'throwIn' \| 'goalKick' }` | `boundarySystem` | `gameplayEventPhase` | executes the crude restart |
| `HalfEnded { half }` | `matchClockSystem` | `gameplayEventPhase` | pauses sim, phase transition |

### Fixed-tick system order (extends `game-loop.tsx`)

```
matchClockSystem          advances accelerated clock, emits HalfEnded
ballDutySystem            assigns/clears IsCarrier·IsReceiver·IsChaser
carrierDecisionSystem     ticks think-timer; on expiry: candidates → score → pick → action
positioningSystem         TargetPosition for all players WITHOUT duty tags (unchanged)
ballDutyMovementSystem    TargetPosition for carrier (dribble target), receiver, chasers
movementSystem            unchanged
ballCarrySystem           ball Position ← carrier feet (BallCarried)
ballFlightSystem          ball Position along parametric path; completion → claim/resolve (BallInFlight)
looseBallSystem           roll + friction, claim within radius (BallLoose)
boundarySystem            goal-line & touchline checks → events
gameplayEventPhase        drains possession/goal/OOB/half events
statsPhase                drains stat events into MatchStats
--- variable rate ---
syncTransformSystem, syncDebugTargetsSystem   unchanged
```

### New files

```
src/core/random.ts                       seeded PRNG (mulberry32), MatchRandom helpers
src/core/ai/candidates.ts                candidate action generation (pure)
src/core/ai/scoring.ts                   scoring functions: openness, lane risk, progression, pressure, shot quality (pure)
src/core/actions/ball-control.ts         claimBall, giveBallTo, releaseBallLoose
src/core/actions/kicking.ts              kickPass, kickClear, kickShot (pre-resolution lives here)
src/core/actions/match-flow.ts           spawnMatch, resetForKickoff, startHalf
src/core/systems/ball-duty-system.ts
src/core/systems/carrier-decision-system.ts
src/core/systems/ball-duty-movement-system.ts
src/core/systems/ball-carry-system.ts
src/core/systems/ball-flight-system.ts
src/core/systems/loose-ball-system.ts
src/core/systems/boundary-system.ts
src/core/systems/match-clock-system.ts
src/core/events/match-events.ts          event trait definitions
src/core/events/gameplay-event-phase.ts
src/core/events/stats-phase.ts
src/core/match/simulate-match.ts         headless harness (step M1.11)
src/core/**/*.test.ts                    vitest, colocated
```

---

## Part 3 — The steps

Conventions for every step: all constants go to `GAME_CONFIG` (values below are tuning starting points, not gospel); mutations go through actions; no comments — names carry meaning; the engineer verifies with `tsc -b`, `oxlint`, and `vitest run`; the designer verifies in their own browser. Each step lists only what is *new*.

---

### M1.1 — Seeded randomness + test foundation ✅

**Goal:** deterministic randomness exists, and the project can run headless tests.

**Design:** `core/random.ts` implements a mulberry32-style step function over a numeric state. State lives in the `MatchRandom` world trait (seeded from `GAME_CONFIG.MATCH.SEED` at match spawn). API: `nextRandom01(world)`, `randomRange(world, min, max)`, `randomChance(world, probability)`, `randomPick(world, items)` — each advances the stored state exactly once per draw so any consumer order change is visible in tests. Add **vitest** (`npm i -D vitest`, `"test": "vitest run"`).

**ECS changes:** `MatchRandom` trait; no systems.

**Config:** `MATCH: { SEED: 42 }`.

**Done when:** unit tests prove: same seed → identical sequence; distribution sanity (mean of 10k draws ≈ 0.5); `randomChance` frequencies match probabilities within tolerance.

**Verification:** engineer: `vitest run` green, tsc/lint clean. Designer: nothing visible yet (only step with no browser payoff — it's 30 minutes of work, and M1.2 pays it off).

---

### M1.2 — Ball possession: someone finally has the ball ✅

**Goal:** a player carries the ball at their feet; the kickoff gives it to a center player.

**Design:** ball phase tags + `CarriedBy` relation per D2. `ballCarrySystem` places the ball at the carrier's position offset `CARRY_OFFSET_M` toward the carrier's current movement direction (fallback: toward opponent goal). Actions in `ball-control.ts`: `claimBall(world, player)` (sets phases, relation, `IsCarrier`, emits `PossessionChanged` when the side flips), `giveBallTo(world, player)` (teleport variant for restarts/debug). Refactor `setupKickoff` → `spawnMatch` + `resetForKickoff` per D6; kickoff gives the ball to the possession side's most central ST/CM.

**ECS changes:** `BallCarried`/`BallInFlight`/`BallLoose`, `CarriedBy`, `IsCarrier`, `PossessionChanged` event + minimal `gameplayEventPhase`, `ballCarrySystem`, ball-control actions, match-flow refactor.

**Config:** `BALL_CONTROL: { CARRY_OFFSET_M: 0.5, CLAIM_RADIUS_M: 1.2 }`.

**Done when:** at kickoff a designated player holds the ball at their feet; as formation drift moves them, the ball moves glued to them; debug "give ball to home/away" buttons work and flip the formation shapes via `PossessionChanged`.

**Verification:** engineer: tests for claim/give actions (phases exclusive, relation exclusive, possession event emitted only on side change). Designer: carrier visibly has the ball; minimap highlights the carrier.

---

### M1.3 — The kick: parametric flight ✅

> Implementation note: the `PassKicked` event was deferred to M1.11 — emitting it before `statsPhase` exists would create a consumer-less event (Rule 13).

**Goal:** the ball can be kicked to any point and flies there believably, ground or lofted.

**Design:** `kickPass(world, kicker, target, flavor)` releases the carrier (clears duty/relation), computes `durationSeconds = distance / speed(flavor)`, sets `BallInFlight` + `BallFlight` + `FlightResolution({ claimant, kind: 'received' })` (claimant = nearest teammate to the target — real receiver selection comes in M1.5; interception risk comes in M1.6). `ballFlightSystem` advances `elapsedSeconds`, lerps x/z, sets y from a parabola scaled by `arcHeight` (0 for ground). On completion: if claimant within `CLAIM_RADIUS_M` × `ARRIVAL_GRACE`, `claimBall`; else `releaseBallLoose` with residual roll velocity. Debug-only interaction: click a pitch point → the current carrier kicks there (ground on click, lofted on shift-click) — this is scaffolding for watching flights before AI exists, lives entirely in `features/debug`, and is removed in M1.5.

**ECS changes:** `BallFlight`, `FlightResolution`, `PassKicked` event, `kickPass`, `releaseBallLoose`, `ballFlightSystem`, temporary debug kick interaction.

**Config:** `PASSING: { GROUND_SPEED_MPS: 18, LOFTED_SPEED_MPS: 14, LOFTED_ARC_HEIGHT_M: 6, ARRIVAL_GRACE: 1.5 }`.

**Done when:** clicking around the pitch produces crisp ground passes and floaty lofted balls that land where aimed and get claimed by whoever is near.

**Verification:** engineer: flight math unit tests (duration from distance, parabola apex, completion position exact). Designer: kick the ball around the pitch by clicking; it feels like passing.

---

### M1.4 — Receivers, chasers, and the loose ball ✅

**Goal:** players react to the ball: intended receivers run to meet passes, nearby players race to loose balls.

**Design:** `ballDutySystem` owns duty tags: while `BallInFlight`, tag the `FlightResolution` claimant `IsReceiver`; while `BallLoose`, tag the nearest `CHASERS_PER_SIDE` players of each team `IsChaser` (recomputed on state change and every `CHASE_REASSIGN_SECONDS`, not per tick, to avoid flicker). `ballDutyMovementSystem` writes `TargetPosition` for receivers (flight destination) and chasers (live ball position). `positioningSystem` adds `Not(IsCarrier), Not(IsReceiver), Not(IsChaser)` filters — formation logic itself untouched (D4). `looseBallSystem` applies `BallRoll` velocity with exponential friction and claims for the first player inside `CLAIM_RADIUS_M`.

**ECS changes:** `IsReceiver`, `IsChaser`, `BallRoll`, `ballDutySystem`, `ballDutyMovementSystem`, `looseBallSystem`, positioning filter change.

**Config:** `LOOSE_BALL: { FRICTION_PER_SECOND: 1.4, MIN_ROLL_SPEED_MPS: 0.3 }`, `DUTIES: { CHASERS_PER_SIDE: 2, CHASE_REASSIGN_SECONDS: 0.25 }`.

**Done when:** an under-hit debug-click pass produces a footrace: receiver and nearby opponents converge on the rolling ball, winner claims it, formations flip if possession changed.

**Verification:** engineer: duty assignment tests (exclusive tags, reassignment cadence, positioning skip). Designer: the footrace moment visibly works and reads as football.

---

### M1.5 — Carrier brain v1: autonomous passing ✅

> Implementation notes: `LastPassFrom` shipped as an exclusive koota relation (carrier → last passer) instead of a data trait — koota's `Norm` type collapses a schema whose only field is an `Entity` into `never`, and the relation is the Rule 20-idiomatic shape anyway; it is stamped on flight arrival via a new `passer` field on `FlightResolution` (so only completed passes create memory) and cleared by `claimBall`. The chooser seam lives in `core/ai/choose-carrier-action.ts`. Config beyond spec: `OPENNESS_CAP_M: 10` (the "capped" openness distance); progression normalizes by `LOFTED_MAX_RANGE_M` so both terms stay in ~[-1, 1]. `hold` re-arms with fresh jitter from the same think range. M1.3 scaffolding removed as planned (`KickMinimap`, `minimap-pitch.tsx`, `giveBallAtPoint`). Headless 5-match-minute run: 111 completed passes, 0 instant return passes, 0 possession flips (turnovers arrive with M1.6 interception). Post-review hardening: `claimBall`/`releaseBallLoose` now clear `BallFlight`/`FlightResolution` too — koota's `add()` is a no-op on an existing trait, so an interrupted flight would have silently corrupted the next kick (regression-tested); the fixed-tick system order moved to `core/match/fixed-tick.ts` (`stepFixedTick`), shared by `game-loop.tsx` and the headless tests — this is where M1.10's `isSimulationActive` gate and M1.11's `simulateMatch` plug in.

**Goal:** both teams pass the ball around on their own — the first autonomous football.

**Design:** `CarrierDecision` think-timer per D3, seeded jitter in `[THINK_SECONDS_MIN, THINK_SECONDS_MAX]`. On expiry, `core/ai/candidates.ts` generates: `passTo(teammate)` for each teammate within range (flavor by distance: ground under `GROUND_MAX_RANGE_M`, lofted under `LOFTED_MAX_RANGE_M`), plus `hold` (re-arms a short timer). `core/ai/scoring.ts` scores each pure-functionally: receiver **openness** (distance from nearest opponent to receiver, capped), **progression** (receiver's x-advance toward opponent goal), **lane risk** placeholder (returns 0 until M1.6), **backpass penalty** via `LastPassFrom` (discourage instant return balls — the anti-ping-pong measure). Weighted sum, argmax with small seeded noise (`PICK_TEMPERATURE`). The chooser seam: `chooseCarrierAction(world, carrier, scoredCandidates)` is the single function M2 will bypass for the human team. Remove the M1.3 debug click-to-kick.

**ECS changes:** `CarrierDecision`, `LastPassFrom`, `carrierDecisionSystem`, `core/ai/` module.

**Config:** `CARRIER_AI: { THINK_SECONDS_MIN: 0.4, THINK_SECONDS_MAX: 0.9, PICK_TEMPERATURE: 0.15, WEIGHT_OPENNESS: 1.0, WEIGHT_PROGRESSION: 0.8, WEIGHT_BACKPASS_PENALTY: 1.2, GROUND_MAX_RANGE_M: 30, LOFTED_MAX_RANGE_M: 50 }`.

**Done when:** with zero input, the possessing team strings together passes that generally move forward, switch flanks occasionally, and never ping-pong A→B→A→B.

**Verification:** engineer: scoring unit tests (open teammate beats marked one; forward beats backward at equal openness; backpass penalized); a 5k-tick headless smoke run asserting >20 completed passes and no crash. Designer: watches keep-away that reads as build-up play. **This is the first "wow" step.**

---

### M1.6 — Interception: passes can fail ✅

> Implementation notes: shared lane math lives in `core/interception.ts` (with `projectOntoSegment` in `core/math.ts`) — `kickPass` pre-resolution and `scoring.ts` lane risk both consume it, so the AI sees exactly the odds the dice use. The interceptor is the highest-chance threat (deterministic argmax); the flight is shortened to that threat's lane projection. `LastPassFrom` is stamped only on `kind: 'received'`. `PassResolved` deferred to M1.11 like `PassKicked` (Rule 13 — no consumer until `statsPhase`).
>
> A cut point only counts when it sits at least `LANE_ENTRY_MARGIN_M` (2m) from **both** ends of the lane. Without that guard `projectOntoSegment`'s endpoint clamping made every opponent within `LANE_RADIUS_M` of the passer — including one standing *behind* them — project onto the ball itself, collect the full `EARLY_LANE_BONUS`, and win the argmax: a marker 1m behind the carrier stole 131 of 200 passes via a zero-duration flight to the carrier's own feet, in whatever direction the pass was aimed. It also double-counted the same defender that `ballContestSystem` is already rolling against, and the mirror case at `progress = 1` double-counted receiver marking, which `receiverOpenness` already scores. `laneThreatChance` is clamped to `[0, 1]` so tuning `BASE_CHANCE + EARLY_LANE_BONUS` past 1 cannot invert `combinedInterceptionChance`.
>
> Tuning deviation, found by parameter sweep: because carriers dodge the very risk model that resolves kicks, spec values (radius 3, full-weight risk) yielded 97% completion and almost no turnovers; shipped `LANE_RADIUS_M: 6.0`, new `CARRIER_AI.WEIGHT_LANE_RISK: 0.4`, and `PICK_TEMPERATURE: 0.25`. The smoke band test aggregates seeds {42, 7, 1234}; current totals are 81 kicks / 18 intercepted (0.778 completion), 61 completed passes, 24 turnovers, 5 dispossessions, with intercept travel spanning 2.2m–36.3m. Also fixed `choose-carrier-action` to read config through the live sub-object (it had snapshotted the primitive, which would have hidden runtime tuning).

**Goal:** possession changes hands organically; the match becomes a contest.

**Design:** pre-resolution per D1, inside `kickPass`: for each opponent within `LANE_RADIUS_M` of the pass segment, interception probability from lane distance and pass progress (closer to the lane and earlier claim points = likelier), combined, one seeded roll. If intercepted: `FlightResolution` becomes `{ claimant: interceptor, kind: 'intercepted' }`, flight destination becomes the interception point on the lane, and `ballDutySystem` tags the interceptor `IsReceiver` (they run to meet it — this is what makes pre-resolution look emergent, D1). The same lane-risk math is exported to `core/ai/scoring.ts`, replacing the M1.5 placeholder — carriers now *see* dangerous lanes and avoid them, which immediately raises pass quality. `PassResolved` event feeds future stats.

**ECS changes:** interception math in `kicking.ts` + `scoring.ts` (shared, per Rule 19), `PassResolved` event. No new systems.

**Config:** `INTERCEPTION: { LANE_RADIUS_M: 3.0, BASE_CHANCE: 0.55, EARLY_LANE_BONUS: 0.2 }`.

**Done when:** risky passes through traffic get cut out; the interceptor visibly runs onto the ball; possession flips back and forth over a minute of watching; carriers demonstrably prefer safe lanes.

**Verification:** engineer: interception probability unit tests (marked lane ≫ open lane); headless run asserts pass completion lands in a 60–90% band. Designer: turnovers look intentional, not teleport-y.

---

### M1.7 — Dribbling and pressure ✅

> Implementation notes: contest logic shipped as its own `ballContestSystem` (between `movementSystem` and `ballCarrySystem`), owning `ContestTimer` and the new `ClaimLockout` trait. The lockout is an off-spec necessity: the squirted ball starts at the victim's feet, so without a 0.5s claim lockout on the dispossessed player, `looseBallSystem` handed the ball straight back next tick and tackles never stuck — `looseBallSystem` now claims for the nearest player passing an `isEligible` predicate on `NearestPlayerRequest`, which rejects anyone still locked out.
>
> Pressure reads live in `core/pressure.ts`: `pressureOn(world, player)` (linear falloff to `RADIUS_M`) and `isUnderTacklePressure(world, player)` (inside `TACKLE_RADIUS_M`), both over one `nearestOpponentDistance` helper. Pressure is read on the **carrier** and multiplies pass openness by `(1 - pressure)` — receiver marking is already the openness term itself, and this reading is what produces "swarmed midfielder stops threading passes, escapes or loses it".
>
> Dribbling executes via `DribbleTarget` + `DribbleSpeedFactor` traits set by `startDribble` (cleared by `stopDribble` / `stripCarrierDuty`, which now bundles every carrier-loss path in `claimBall`/`releaseBallLoose`/`kickPass`); picking `hold` stops an in-progress dribble. The speed trait is deliberately dribble-scoped, not a generic `MoveSpeedFactor`: its owner `remove`s it outright on every dribble stop and possession loss, so a shared trait would silently wipe any future sprint/stamina modifier. When a second modifier lands, replace it with a multiplicative stack rather than a second writer.
>
> Clear is `kickClear` = lofted `kickPass` at a pitch-clamped point `CLEARING.DISTANCE_M` upfield, scored `WEIGHT × pressure × own-third deepness + BASE_SCORE (-0.5)` so it stays below hold except in genuine panic; `clearCandidates` drops it when the clamped target lands inside `PASSING.MIN_DISTANCE_M`, matching how `passFlavorForDistance` gates passes. GKs get no dribble probes (pre-empting GK suicide until D5's distribution brain in M1.8). `core/pitch.ts` extracted (`clampToPitch`/`isWithinPitch`/`OWN_GOAL_LINE_X`), shared by positioning, probe generation and clear scoring. `scoreCarrierCandidate` dispatches every union member explicitly and funnels the fallthrough into a `never` parameter, so a new candidate kind is a compile error rather than a silent mis-score. The four countdown traits (`ChaseReassignCooldown`, `CarrierDecision`, `ContestTimer`, `ClaimLockout`) share `core/countdown.ts` — `tickCountdown` for the per-owner ones, `expireCountdowns` for the query-wide lockout drain.
>
> Tuning by sweep (deleted after): dribble weights shipped `WEIGHT_SPACE 0.5→0.3, WEIGHT_PROGRESSION 0.6→0.4, WEIGHT_ESCAPE 0.6` — heavier values collapsed passing to 29 completed per 3 seeds; spec `TACKLE_RADIUS_M 1.5` + `CONTEST_INTERVAL_SECONDS 0.6` yielded ~0–1 dispossessions per 3 matches (nobody presses the carrier yet — defenders only approach via formation ball-pull, so 1.5m-for-0.6s almost never held); shipped `2.5` + `0.4`. Smoke floor adjusted 60→45 completed passes (dribbles legitimately replace passes) and now asserts ≥3 dispossessions. No `Dispossessed` event yet — Rule 13, no consumer until M1.11's `statsPhase`, same deferral as `PassKicked`/`PassResolved`.

**Goal:** carriers advance with the ball when unpressured and get punished for holding it under pressure.

**Design:** new candidates: `dribbleTo(point)` — probe points fanned toward the opponent goal at `DRIBBLE_PROBE_DISTANCE_M`, scored by open space (no opponent within `SPACE_RADIUS_M`) and progression; and `clear` — a low-scored panic option that spikes when pressured deep in one's own third (lofted kick upfield to no one → loose ball). Pressure becomes a first-class scoring input: `pressureOn(world, player)` = falloff function of nearest-opponent distance; it now *reduces* effective openness in pass scoring and *raises* clear/dribble-away scores. Carrier movement: `ballDutyMovementSystem` steers `IsCarrier` toward the dribble target at `DRIBBLE_SPEED_FACTOR` × run speed. Dispossession backstop (prevents the waltz-through-five-defenders failure mode): while an opponent stays within `TACKLE_RADIUS_M` of the carrier, a seeded contest rolls every `CONTEST_INTERVAL_SECONDS`; on failure the ball squirts loose with a small random velocity. The AI's pressure-aversion makes this rare; the backstop makes it inevitable when the AI misjudges.

**ECS changes:** dribble/clear candidates + pressure scoring (pure functions), contest logic in a small `ballContestSystem` or folded into `ballCarrySystem` — decide in-session by size, ownership documented either way.

**Config:** `DRIBBLING: { PROBE_DISTANCE_M: 8, SPACE_RADIUS_M: 5, SPEED_FACTOR: 0.85 }`, `PRESSURE: { RADIUS_M: 4, TACKLE_RADIUS_M: 1.5, CONTEST_INTERVAL_SECONDS: 0.6, DISPOSSESS_CHANCE: 0.35 }`, `CLEARING: { PANIC_THIRD_X: -35, WEIGHT: 1.5 }`.

**Done when:** an open winger runs 20 meters with the ball; a swarmed midfielder loses it; deep defenders under pressure hoof it upfield.

**Verification:** engineer: pressure falloff and dribble scoring tests; headless run asserts turnovers occur via both interception AND dispossession. Designer: the match now has territory swings and scrappy moments.

---

### M1.8 — Shooting, goals, score ✅

> Implementation notes: shot math shipped as `core/shooting.ts` (`shotGeometry`/`isShootingPosition`/`shotQuality`/`shotConversionChance`), the M1.6 `interception.ts` precedent — candidates, scoring, and `kickShot` all consume the same functions, so the AI's shot score is literally the conversion geometry M3 will display. Goal geometry (`opponentGoalCenter`) went to `core/pitch.ts`, not `core/math.ts` as planned — pitch.ts became the pitch-domain home in the M1.7 review. Conversion formula: `quality = angleFactor × exp(-falloff × distance)`, `pGoal = lerp(BASE_CONVERSION, 1, quality²)`; one seeded roll splits goal / saved / offTarget (save share of the non-goal remainder). Destinations: goal → seeded point inside the mouth (`GOAL_MOUTH_INSET`), saved → the GK's position at kick time (claimant GK via `findGoalkeeper`; no GK in the world → falls through to offTarget), offTarget → a point wide of the posts clamped in-bounds (`clampToPitch` — this clamp IS the planned stopgap, remove in M1.9). `launchBallFlight` extracted so `kickPass` and `kickShot` share the flight/resolution setup. The shot's `FlightResolution.claimant` is the shooter, so `ballDutySystem` makes them chase their own shot — reads as follow-through. Deferred: `MatchPhase` ('kickoff' blip) to M1.10 — with no clock there is nothing to gate, the reset is instant; `ShotTaken` event to M1.11 (Rule 13, same deferral as `PassKicked`/`PassResolved`). Tuning: spec `WEIGHT_QUALITY 2.0` made shooting rare-but-lethal (shoot only wins at quality ≳0.6 ≈ inside 10m central → 5 shots, 3 goals per 3×83s seeds); shipped `3.0` (shot zone widens to ≈18m) plus `BASE_CONVERSION 0.12→0.15` → 7 shots = 2 goals + 3 saves + 2 misses across seeds {42,7,1234}, every outcome visible and GK distribution exercised. Smoke run now counts shot flights separately from pass flights (they would otherwise inflate the completion band), asserts >3 shots and ≥1 goal, and the dispossession floor relaxed 3→1 — shots terminate attacks that previously stalled into byline dribble-contests. Debug panel gained the scoreboard.

**Goal:** matches produce goals; the score is real; play restarts from kickoff.

**Design:** `shoot` candidate when within `MAX_RANGE_M` and a shooting cone toward goal; scored by an xG-flavored quality function of distance and angle (built in `scoring.ts` so M3 reuses its shape for displayed percentages). `kickShot` pre-resolves per D1/D5: quality → outcome weights → seeded roll → `goal` (flight destination = a point inside the goal mouth), `saved` (destination = GK, GK claims on arrival and distributes via the normal brain), or `offTarget` (destination past the goal line → `BallWentOut` flow, arriving in M1.9 — until then, off-target lands as loose ball behind the line clamped in-bounds, one-line stopgap removed next step). `GoalScored` drains in `gameplayEventPhase`: increment `Score`, brief `MatchPhase: 'kickoff'`, `resetForKickoff(concedingSide)`.

**ECS changes:** `ShotTaken`/`GoalScored` events, `kickShot`, shot candidates + quality function, goal-mouth geometry helpers in `core/math.ts`.

**Config:** `SHOOTING: { MAX_RANGE_M: 24, CONE_HALF_ANGLE_DEG: 55, BASE_CONVERSION: 0.12, QUALITY_DISTANCE_FALLOFF: 0.05, OUTCOME_SAVE_SHARE: 0.55 }`.

**Done when:** attacks culminate in shots; some fly in, some are "saved" into the GK's hands, GK restarts play; the score mounts and kickoffs reset cleanly.

**Verification:** engineer: quality-function tests (close center ≫ far wide), outcome distribution test; headless: goals occur, `resetForKickoff` leaves a valid world (23 entities, one carrier, phases consistent). Designer: the first real goal of the project. 🎉

---

### M1.9 — Boundaries: the pitch has edges

**Goal:** the ball can no longer leave reality; out-of-bounds restarts crudely but coherently.

**Design:** `boundarySystem` checks loose and in-flight ball positions each tick against the pitch rect and the goal mouths. Crossing the goal line between the posts (from any state — covers deflected loose-ball goals too) emits `GoalScored`. Otherwise: touchline exit → `BallWentOut { restart: 'throwIn' }`; goal-line exit → `{ restart: 'goalKick' }` (corners collapse into goal kicks — D8; the attacking-team corner case is accepted as wrong-but-coherent for M1). Drain executes: throw-in → `giveBallTo` nearest non-GK player of the team that didn't touch it last (track `LastTouchedBy` on the ball, set by claim/kick actions); goal kick → `giveBallTo` the defending GK. Remove the M1.8 stopgap clamp.

**ECS changes:** `boundarySystem`, `BallWentOut` event + drain handling, `LastTouchedBy` trait on ball.

**Config:** `BOUNDARIES: { RESTART_INSET_M: 1.0 }`.

**Done when:** a full 10-minute watch produces zero ball-in-the-void states; wide shots become goal kicks; wayward passes become instant throw-ins that don't break the match's flow.

**Verification:** engineer: boundary geometry tests (goal vs goal-kick vs throw-in classification); long headless run asserts ball position always within pitch + grace margin. Designer: nothing looks broken anymore — the sim is now *safe to leave running*.

---

### M1.10 — The match clock: halves, full time

**Goal:** the sim becomes a *match*: 45-minute halves at accelerated speed, halftime, full time.

**Design:** `matchClockSystem` advances `MatchClock.matchSeconds` by `tick × CLOCK_SCALE` while `MatchPhase` is `playing`. At 45' emit `HalfEnded { half: 1 }` → phase `halfTime`, `isRunning: false` (simulation systems already gate on the clock running — establish that gate here as a single `isSimulationActive(world)` guard used by the decision/movement/ball systems, which is *also the exact mechanism M2's pause will use*). Debug button advances to the second half (`resetForKickoff` for the other team, no side swap — D8); at 90' → `fullTime`, sim halts, debug shows final score + stats, restart button calls `spawnMatch` fresh.

**ECS changes:** `MatchClock`, `MatchPhase`, `matchClockSystem`, `HalfEnded` event, `isSimulationActive` gate threaded through tick systems, `startHalf` action.

**Config:** `MATCH: { CLOCK_SCALE: 10, HALF_MATCH_MINUTES: 45 }` (≈4.5 real minutes per half — pending designer answer to open question 1).

**Done when:** a match runs kickoff → halftime → second half → full time unattended, ending with a plausible score line.

**Verification:** engineer: clock/phase transition tests; headless full-match run terminates at `fullTime`. Designer: watches (or leaves running) an entire match for the first time.

---

### M1.11 — Telemetry and the headless harness

**Goal:** believability becomes measurable; regressions become catchable without watching.

**Design:** `statsPhase` drains `PassKicked`/`PassResolved`/`ShotTaken`/`GoalScored`/`BallWentOut` into `MatchStats` (per-side counters + possession seconds accumulated by a light sampler). Debug panel gains a live stats table. `core/match/simulate-match.ts`: `simulateMatch(seed)` — spawns a world (no React, Rule 22 pays off), ticks to full time, returns final `MatchStats` + `Score`. Vitest suite: **determinism** (same seed twice → deep-equal stats and score); **sanity bands** over ~20 seeds: total goals 2–6 avg, possession 40–60%, pass completion 60–90%, OOB < 25/match, no half with zero shots. Bands live in `GAME_CONFIG.SANITY` so tuning updates them consciously.

**ECS changes:** `MatchStats`, `statsPhase`, harness module, test suite.

**Config:** `SANITY: { GOALS_AVG_RANGE: [2, 6], POSSESSION_RANGE: [0.4, 0.6], PASS_COMPLETION_RANGE: [0.6, 0.9], MAX_OOB_PER_MATCH: 25 }`.

**Done when:** `vitest run` simulates matches and passes the bands; the debug panel shows live match stats.

**Verification:** engineer: this step *is* the verification infrastructure — from here on, every tuning change re-runs the bands. Designer: stats table corroborates (or contradicts) what their eyes say.

---

### M1.12 — The believability pass

**Goal:** the braindead match earns the word "watchable" — M1's exit review.

**Design:** a tuning session, not a feature session. Inputs: the designer watches 2–3 full matches and lists the worst moments; the engineer runs the harness across many seeds. Together, walk the classic failure-mode checklist from the meetup: ball ping-pong (M1.5's penalty tuned?), everyone-chases-ball (duty caps working?), statically watching a through-ball (chase reassignment cadence?), endless sideways passing (progression weight?), silly scorelines (conversion/interception balance?), GK suicide (distribution scoring?). Fix via config tuning first; only touch code where a mechanism (not a number) is proven wrong. Add debug affordances discovered to be missing (candidate-score inspector overlay — "why did he pick that pass?" — is the expected big one; add it here if M1.5–M1.7 sessions didn't already justify it). Update `SANITY` bands to the tuned reality. Close M1 with a review against [R3F-GAME-CODEBASE-RULES.md](R3F-GAME-CODEBASE-RULES.md) across all new files.

**Done when:** DESIGN-V1's M1 exit test holds: a fresh viewer watches a half and describes it as "two teams playing football," not "a simulation glitching."

**Verification:** designer sign-off + green harness = M1 complete. The M2 pause work starts from the `isSimulationActive` gate and the `chooseCarrierAction` seam, both already in place.

---

## Part 4 — Believability targets (harness bands + eye test)

| Metric | Target band | Guarded by |
| --- | --- | --- |
| Total goals per match | 2–6 | M1.8 conversion, M1.11 bands |
| Possession split | 40–60% | symmetric AI, M1.11 bands |
| Pass completion | 60–90% | M1.6 lane math vs M1.5 scoring |
| Out-of-bounds per match | < 25 | M1.9, M1.11 bands |
| A→B→A instant return passes | rare | M1.5 backpass penalty |
| Players chasing one loose ball | ≤ 2 per side | M1.4 duty caps |
| Solo dribble through 3+ defenders | rare | M1.7 backstop |

## Part 5 — What M1 hands to M2

- `chooseCarrierAction` seam: swap AI argmax for human input on decision points.
- `isSimulationActive` gate: the pause mechanism, already threaded through every tick system.
- Scored candidates: become the displayed options (and later, M3 percentages).
- Pre-resolution-at-commit: becomes the dice roll when cards modify chances.
- Seeded RNG + harness: regression safety for every mechanic M2+ adds.

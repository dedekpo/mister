# PROTOTYPE-PLAN — Road to the Beat Loop Prototype

Step-by-step implementation plan for the prototype defined in [DESIGN-V1.md](DESIGN-V1.md). Ordered so that **every milestone ends with something watchable/playable** and each one answers a question before we invest in the next. Checkboxes track progress.

## M0 — Foundation ✅ (already built)

- [x] ECS world (koota) with fixed-tick game loop
- [x] Field, goals, 22 player capsules, ball rendering
- [x] Formation-based positioning AI (role anchors + attacking/defending shape + ball pull)
- [x] Movement system (players walk toward targets)
- [x] Tactical override support, possession trait
- [x] Debug tooling: panel, minimap, target visualization, coach panel

## M1 — The braindead match (no input, ball moves, goals happen)

> Superseded by the detailed [M1-PLAN.md](M1-PLAN.md) — meeting decisions, target architecture, and 12 session-sized steps. The checklist below is kept only as a scope summary.

**Question it answers:** can 22 AI capsules play a watchable, believable-enough match on their own? This is the substrate everything else sits on.

- [ ] **Ball ownership model**: a carrier entity "has" the ball (ball follows carrier's feet); loose-ball state when no one has it; nearest-player pickup.
- [ ] **Ball motion**: kicked ball travels to a target point with speed/arc (ground pass vs lofted, simple parametric motion — no physics engine).
- [ ] **Baseline carrier AI**: the ball carrier automatically picks a safe action on a short think-timer — pass to the best-scored teammate, dribble forward, clear under pressure, shoot when close. Same brain for both teams.
- [ ] **Interception**: defenders near a pass line have a chance to cut it; loose balls are contested.
- [ ] **Match framing**: accelerated match clock, score state, goal detection, kickoff reset after goals, halftime/full-time stop.
- [ ] **Out of bounds (crude)**: ball auto-returns to nearest eligible player, no decision point, no thrown-in animation.
- [ ] Debug: sim speed slider, "force possession" button, restart match.

**Done when:** you can watch a full accelerated half where both AI teams trade possession and score occasionally, without touching anything.

## M2 — Decision points & free actions (the game pauses, you steer)

**Question it answers:** does the pause → decide → resolve rhythm feel good, even with zero cards?

- [ ] **Match state machine**: `running → decision (paused/slow-mo) → resolving → running`. Pause implemented by scaling/halting the simulation tick (render loop keeps running).
- [ ] **Decision-point triggers** (config-driven so we can tune which are active): your player receives the ball; possession changes; opponent enters your defensive third.
- [ ] **Slow-mo/pause presentation**: time-scale fade in/out (feel pass comes later; just functional here).
- [ ] **Spatial input**: ground-plane raycast for point targeting; hover/click player selection; visual target marker.
- [ ] **Free basic actions UI**: when paused with your carrier — safe pass (click teammate), dribble (click direction/point), shoot, clear, hold. Deterministic success for now (no dice yet).
- [ ] **Movement orders**: click off-ball teammate → click destination; capped at 2 per pause; player runs there then resumes formation logic.
- [ ] **Resume flow**: confirm/auto-confirm → resolution plays out → next trigger.

**Done when:** you can play a half using only free actions and movement orders, steering your team to a goal while the opponent AI plays M1 logic.

## M3 — Resolution model (dice, stats, shown percentages)

**Question it answers:** does risk/reward with visible percentages create tension?

- [ ] **Player attributes**: minimal stat set on player entities (e.g. passing, dribbling, shooting, tackling, pace). Data-driven per role for now.
- [ ] **Chance model**: success % computed from actor stats + situation (distance, pressure = nearby defenders, angle). One pure function per action type; unit-testable.
- [ ] **Chance preview**: show the live % on the target marker while aiming, before committing.
- [ ] **Outcome branching**: roll → completed / intercepted / deflected / loose ball; each branch feeds back into the sim naturally.
- [ ] **Baseline AI uses the same model** (both teams roll the same dice — fairness).
- [ ] Debug: seedable RNG, roll log panel, chance-model tuning sliders.

**Done when:** aiming a risky through-ball at 40% vs a safe pass at 90% is a real decision, and outcomes visibly follow the odds.

## M4 — Cards (hand, targeting, brilliance)

**Question it answers:** do cards on top of free actions create the "flash of brilliance" feeling and meaningful choices?

- [ ] **Card data model**: id, name, description, action type, targeting mode (teammate / point / zone / self), modifiers, requirements (e.g. "carrier is a winger").
- [ ] **Hand state**: starter deck (fixed ~15 cards), hand of 5, draw 1 after each play, discard on play, reshuffle when empty.
- [ ] **Card play flow**: select card → spatial targeting (same input layer as M2) → chance preview with card modifiers → resolve.
- [ ] **Starter card set (~8 cards)**: Killer Through Ball, Long Switch, Low Cross, Sprint Forward, Overlap Run, Rainbow Flick, Crunching Tackle, Press Trap. Each must exercise a different targeting mode or modifier type.
- [ ] **Match HUD**: hand (bottom bar), score, clock, possession indicator, orders-remaining counter.
- [ ] **Effect cards (1–2 only)**: e.g. "if losing, +10% to all actions" — to prove the modifier pipeline handles passive/conditional effects.

**Done when:** a full attacking possession can be played mixing free actions and cards, and the hand visibly shapes your options.

## M5 — Defense & a real opponent

**Question it answers:** is defending fun, or a chore? (Big unknown — watch closely in playtests.)

- [ ] **Defensive decision points**: opponent carrier enters trigger zones → pause → play defensive cards (tackle, press trap, offside trap) and/or movement orders.
- [ ] **Defensive free actions**: contain (default), press carrier, mark a player.
- [ ] **Opponent decision AI**: upgrade the M1 baseline for the away team — occasionally attempts "brilliance" actions (as if playing cards) so it doesn't feel passive; difficulty = how good its choices are, not stat cheats.
- [ ] Tune decision-point density so defense doesn't pause more than attack.

**Done when:** you can lose a match because the opponent attacked well, and defending felt like decisions rather than interruptions.

## M6 — Feel pass & playtest slice

**Question it answers:** the toy question — is it fun in the first 60 seconds?

- [ ] **Juice minimum**: slow-mo fades, pass/shot trails or lines, success/fail flair (flash, screen shake on goals), goal celebration beat, sound stubs optional.
- [ ] **Camera**: framing that keeps ball + relevant space visible; light punch-in on decision points.
- [ ] **Match flow**: start screen → one half (~5–7 min) → result screen → restart.
- [ ] **Tuning panel**: sim speed, order cap, draw cadence, trigger toggles, full-pause vs slow-mo toggle — the open levers from DESIGN-V1, changeable mid-match.
- [ ] **Playtest**: designer plays daily builds; then at least one fresh player, observed silently. Evaluate against DESIGN-V1 success criteria.

**Done when:** a fresh player finishes a half unprompted and asks for another — or we learn precisely why not, and iterate.

---

## Working agreements

- After each milestone: review against [R3F-GAME-CODEBASE-RULES.md](R3F-GAME-CODEBASE-RULES.md), verify with `tsc` + lint; the designer playtests in their own browser.
- Milestones are sequential, but steps within a milestone can be reordered freely.
- Anything that threatens a milestone's "done when" gets cut or faked first, redesigned later.

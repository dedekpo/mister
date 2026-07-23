import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo } from "../actions/ball-control";
import { spawnMatch } from "../actions/match-flow";
import { stepFixedTick } from "../match/fixed-tick";
import { seedMatchRandom } from "../random";
import {
  BallFlight,
  BallInFlight,
  BallLoose,
  CarriedBy,
  CarrierDecision,
  DribbleTarget,
  FlightResolution,
  IsBall,
  IsCarrier,
  IsPlayer,
  LastPassFrom,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type PlayerRoleId,
  type TeamSideId,
} from "../traits";
import { carrierDecisionSystem } from "./carrier-decision-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const TICKS_BELOW_MIN_THINK =
  Math.floor(CARRIER_AI.THINK_SECONDS_MIN / TICK) - 2;
const TICKS_ABOVE_MAX_THINK =
  Math.ceil(CARRIER_AI.THINK_SECONDS_MAX / TICK) + 2;

let world: World;

beforeEach(() => {
  world = createWorld();
  world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
});

function spawnPlayerAt(
  x: number,
  z: number,
  side: TeamSideId,
  role: PlayerRoleId = "CM",
): Entity {
  return world.spawn(
    IsPlayer,
    TeamSide({ side }),
    PlayerRole({ role }),
    Position({ x, y: 0, z }),
    TargetPosition({ x, z }),
    Speed({ metersPerSecond: GAME_CONFIG.PLAYER.RUN_SPEED_MPS }),
  );
}

function ball() {
  return world.queryFirst(IsBall)!;
}

function runDecisionTicks(tickCount: number) {
  for (let tick = 0; tick < tickCount; tick += 1) {
    carrierDecisionSystem(world, TICK);
  }
}

describe("carrierDecisionSystem", () => {
  it("arms a fresh carrier with a jittered think timer", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, carrier);
    carrierDecisionSystem(world, TICK);
    const decision = carrier.get(CarrierDecision);
    expect(decision).toBeDefined();
    expect(decision!.remainingSeconds).toBeGreaterThan(
      CARRIER_AI.THINK_SECONDS_MIN - 2 * TICK,
    );
    expect(decision!.remainingSeconds).toBeLessThanOrEqual(
      CARRIER_AI.THINK_SECONDS_MAX,
    );
  });

  it("removes decisions from players who lost the ball", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const other = spawnPlayerAt(5, 5, "home");
    giveBallTo(world, carrier);
    carrierDecisionSystem(world, TICK);
    giveBallTo(world, other);
    carrierDecisionSystem(world, TICK);
    expect(carrier.has(CarrierDecision)).toBe(false);
    expect(other.has(CarrierDecision)).toBe(true);
  });

  it("waits out the think timer before kicking to the best teammate", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const openForwardTeammate = spawnPlayerAt(20, 0, "home");
    giveBallTo(world, carrier);
    runDecisionTicks(TICKS_BELOW_MIN_THINK);
    expect(carrier.has(IsCarrier)).toBe(true);
    runDecisionTicks(TICKS_ABOVE_MAX_THINK - TICKS_BELOW_MIN_THINK);
    expect(ball().has(BallInFlight)).toBe(true);
    expect(ball().get(FlightResolution)?.claimant).toBe(openForwardTeammate);
    expect(carrier.has(IsCarrier)).toBe(false);
    expect(carrier.has(CarrierDecision)).toBe(false);
  });

  it("starts a forward dribble when alone in open space", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, carrier);
    runDecisionTicks(TICKS_ABOVE_MAX_THINK);
    expect(carrier.has(IsCarrier)).toBe(true);
    expect(carrier.get(DribbleTarget)?.x).toBeGreaterThan(0);
    expect(carrier.get(CarrierDecision)!.remainingSeconds).toBeGreaterThan(
      0,
    );
  });

  it("makes a pressured goalkeeper hoof it clear from the own third", () => {
    const goalkeeper = spawnPlayerAt(-50, 0, "home", "GK");
    spawnPlayerAt(-49.9, 0, "away");
    giveBallTo(world, goalkeeper);
    runDecisionTicks(TICKS_ABOVE_MAX_THINK);
    expect(ball().has(BallInFlight)).toBe(true);
    expect(ball().get(BallFlight)?.arcHeight).toBe(
      GAME_CONFIG.PASSING.LOFTED_ARC_HEIGHT_M,
    );
    expect(goalkeeper.has(IsCarrier)).toBe(false);
  });

  it("holds and re-arms instead of returning the ball to a marked passer", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const passer = spawnPlayerAt(-10, 0, "home");
    spawnPlayerAt(-10.5, 0, "away");
    giveBallTo(world, carrier);
    carrier.add(LastPassFrom(passer));
    runDecisionTicks(TICKS_ABOVE_MAX_THINK);
    expect(carrier.has(IsCarrier)).toBe(true);
    expect(ball().has(BallInFlight)).toBe(false);
    expect(carrier.get(CarrierDecision)!.remainingSeconds).toBeGreaterThan(
      0,
    );
  });
});

describe("contested match smoke run", () => {
  const COMPLETION_BAND_MIN = 0.6;
  const COMPLETION_BAND_MAX = 0.9;
  const SMOKE_SEEDS = [42, 7, 1234];

  interface SmokeStats {
    completedPasses: number;
    turnovers: number;
    kicks: number;
    interceptedKicks: number;
    dispossessions: number;
  }

  function runContestedMatch(seed: number): SmokeStats {
    const matchWorld = createWorld();
    spawnMatch(matchWorld);
    seedMatchRandom(matchWorld, seed);
    const stats: SmokeStats = {
      completedPasses: 0,
      turnovers: 0,
      kicks: 0,
      interceptedKicks: 0,
      dispossessions: 0,
    };
    let wasInFlight = false;
    let wasCarried = false;
    let previousCarrier: Entity | undefined;
    for (let tick = 0; tick < 5000; tick += 1) {
      stepFixedTick(matchWorld, TICK);
      const matchBall = matchWorld.queryFirst(IsBall)!;
      const isInFlight = matchBall.has(BallInFlight);
      if (isInFlight && !wasInFlight) {
        stats.kicks += 1;
        if (matchBall.get(FlightResolution)?.kind === "intercepted") {
          stats.interceptedKicks += 1;
        }
      }
      if (wasCarried && matchBall.has(BallLoose)) stats.dispossessions += 1;
      wasInFlight = isInFlight;
      const carrier = matchBall.targetFor(CarriedBy);
      wasCarried = carrier !== undefined;
      if (carrier && previousCarrier && carrier !== previousCarrier) {
        const isSameSide =
          carrier.get(TeamSide)?.side === previousCarrier.get(TeamSide)?.side;
        if (isSameSide) stats.completedPasses += 1;
        if (!isSameSide) stats.turnovers += 1;
      }
      if (carrier) previousCarrier = carrier;
    }
    expect([...matchWorld.query(IsCarrier)].length).toBeLessThanOrEqual(1);
    matchWorld.destroy();
    return stats;
  }

  it("keeps passing inside the believability band across seeds", () => {
    const runs = SMOKE_SEEDS.map(runContestedMatch);
    const totals = runs.reduce<SmokeStats>(
      (sum, run) => ({
        completedPasses: sum.completedPasses + run.completedPasses,
        turnovers: sum.turnovers + run.turnovers,
        kicks: sum.kicks + run.kicks,
        interceptedKicks: sum.interceptedKicks + run.interceptedKicks,
        dispossessions: sum.dispossessions + run.dispossessions,
      }),
      {
        completedPasses: 0,
        turnovers: 0,
        kicks: 0,
        interceptedKicks: 0,
        dispossessions: 0,
      },
    );
    const completion = (totals.kicks - totals.interceptedKicks) / totals.kicks;
    expect(totals.completedPasses).toBeGreaterThan(45);
    expect(totals.interceptedKicks).toBeGreaterThan(0);
    expect(totals.dispossessions).toBeGreaterThanOrEqual(3);
    expect(totals.turnovers).toBeGreaterThan(3);
    expect(completion).toBeGreaterThanOrEqual(COMPLETION_BAND_MIN);
    expect(completion).toBeLessThanOrEqual(COMPLETION_BAND_MAX);
  });
});

import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo } from "../actions/ball-control";
import { spawnMatch } from "../actions/match-flow";
import { stepFixedTick } from "../match/fixed-tick";
import {
  BallInFlight,
  CarriedBy,
  CarrierDecision,
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

function spawnPlayerAt(x: number, z: number, side: TeamSideId): Entity {
  return world.spawn(
    IsPlayer,
    TeamSide({ side }),
    PlayerRole({ role: "CM" }),
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
    expect(decision!.thinkRemainingSeconds).toBeGreaterThan(
      CARRIER_AI.THINK_SECONDS_MIN - 2 * TICK,
    );
    expect(decision!.thinkRemainingSeconds).toBeLessThanOrEqual(
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

  it("holds and re-arms instead of returning the ball to a marked passer", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const passer = spawnPlayerAt(-10, 0, "home");
    spawnPlayerAt(-10.5, 0, "away");
    giveBallTo(world, carrier);
    carrier.add(LastPassFrom(passer));
    runDecisionTicks(TICKS_ABOVE_MAX_THINK);
    expect(carrier.has(IsCarrier)).toBe(true);
    expect(ball().has(BallInFlight)).toBe(false);
    expect(carrier.get(CarrierDecision)!.thinkRemainingSeconds).toBeGreaterThan(
      0,
    );
  });
});

describe("autonomous passing smoke run", () => {
  it("completes passes and keeps a valid world over 5000 ticks", () => {
    const matchWorld = createWorld();
    spawnMatch(matchWorld);
    let completedPasses = 0;
    let previousCarrier: Entity | undefined;
    for (let tick = 0; tick < 5000; tick += 1) {
      stepFixedTick(matchWorld, TICK);
      const carrier = matchWorld
        .queryFirst(IsBall)
        ?.targetFor(CarriedBy);
      const isCompletedPass =
        carrier !== undefined &&
        previousCarrier !== undefined &&
        carrier !== previousCarrier &&
        carrier.get(TeamSide)?.side === previousCarrier.get(TeamSide)?.side;
      if (isCompletedPass) completedPasses += 1;
      if (carrier) previousCarrier = carrier;
    }
    expect(completedPasses).toBeGreaterThan(20);
    expect([...matchWorld.query(IsCarrier)].length).toBeLessThanOrEqual(1);
  });
});

import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import { seedMatchRandom } from "../random";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  CarriedBy,
  FlightResolution,
  IsBall,
  IsCarrier,
  IsPlayer,
  LastPassFrom,
  PlayerRole,
  Position,
  Possession,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { claimBall, giveBallTo } from "./ball-control";
import { kickPass, resolveFlightArrival } from "./kicking";

const PASSING = GAME_CONFIG.PASSING;

let world: World;

beforeEach(() => {
  world = createWorld();
  world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
});

afterEach(() => {
  world.destroy();
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

describe("kickPass", () => {
  it("releases the carrier and puts the ball in flight", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 18, z: 0 }, "ground");
    expect(kicker.has(IsCarrier)).toBe(false);
    expect(ball().has(BallCarried)).toBe(false);
    expect(ball().has(BallInFlight)).toBe(true);
    const flight = ball().get(BallFlight)!;
    expect(flight.durationSeconds).toBeCloseTo(18 / PASSING.GROUND_SPEED_MPS);
    expect(flight.arcHeight).toBe(0);
  });

  it("lofts with the configured arc and speed", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 0, z: 28 }, "lofted");
    const flight = ball().get(BallFlight)!;
    expect(flight.durationSeconds).toBeCloseTo(28 / PASSING.LOFTED_SPEED_MPS);
    expect(flight.arcHeight).toBe(PASSING.LOFTED_ARC_HEIGHT_M);
  });

  it("targets the nearest teammate to the landing point as claimant", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    const nearTeammate = spawnPlayerAt(20, 2, "home");
    spawnPlayerAt(40, 0, "home");
    spawnPlayerAt(19, 8, "away");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 20, z: 0 }, "ground");
    expect(ball().get(FlightResolution)?.claimant).toBe(nearTeammate);
  });

  it("ignores kicks from players who are not carrying", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const bystander = spawnPlayerAt(5, 5, "home");
    giveBallTo(world, carrier);
    kickPass(world, bystander, { x: 20, z: 0 }, "ground");
    expect(ball().has(BallCarried)).toBe(true);
    expect(carrier.has(IsCarrier)).toBe(true);
  });

  it("ignores kicks shorter than the minimum distance", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: PASSING.MIN_DISTANCE_M / 2, z: 0 }, "ground");
    expect(ball().has(BallCarried)).toBe(true);
    expect(kicker.has(IsCarrier)).toBe(true);
  });
});

describe("pre-resolved interception", () => {
  function kickThroughGuardedLane(seed: number) {
    world.destroy();
    world = createWorld();
    seedMatchRandom(world, seed);
    world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
    const kicker = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(20, 0, "home");
    const lurker = spawnPlayerAt(10, 1, "away");
    giveBallTo(world, kicker);
    gameplayEventPhase(world);
    kickPass(world, kicker, { x: 20, z: 0 }, "ground");
    return lurker;
  }

  function firstInterceptedLane() {
    for (let seed = 1; seed <= 100; seed += 1) {
      const lurker = kickThroughGuardedLane(seed);
      if (ball().get(FlightResolution)?.kind === "intercepted") return lurker;
    }
    throw new Error("no interception in 100 seeds");
  }

  it("rolls both outcomes and shortens intercepted flights to the cut point", () => {
    let interceptedCount = 0;
    let receivedCount = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const lurker = kickThroughGuardedLane(seed);
      const resolution = ball().get(FlightResolution)!;
      const flight = ball().get(BallFlight)!;
      if (resolution.kind === "received") {
        receivedCount += 1;
        expect(flight.toX).toBe(20);
        continue;
      }
      interceptedCount += 1;
      expect(resolution.claimant).toBe(lurker);
      expect(flight.toX).toBeCloseTo(10);
      expect(flight.toZ).toBeCloseTo(0);
      expect(flight.durationSeconds).toBeCloseTo(
        10 / PASSING.GROUND_SPEED_MPS,
      );
    }
    expect(interceptedCount).toBeGreaterThan(0);
    expect(receivedCount).toBeGreaterThan(0);
  });

  it("lets the interceptor claim without pass memory and flips possession", () => {
    const lurker = firstInterceptedLane();
    resolveFlightArrival(world, ball());
    expect(ball().targetFor(CarriedBy)).toBe(lurker);
    expect(lurker.targetFor(LastPassFrom)).toBeUndefined();
    gameplayEventPhase(world);
    expect(world.get(Possession)?.side).toBe("away");
  });
});

describe("interrupted flights", () => {
  it("kicks fresh after a mid-flight claim wiped the previous flight", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(30, 0, "home");
    const thief = spawnPlayerAt(5, 8, "away");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 30, z: 0 }, "ground");
    claimBall(world, thief);
    expect(ball().has(BallFlight)).toBe(false);
    expect(ball().has(FlightResolution)).toBe(false);
    kicker.set(Position, { x: -40, y: 0, z: -20 });
    kickPass(world, thief, { x: 5, z: -15 }, "ground");
    const flight = ball().get(BallFlight)!;
    expect(flight.toX).toBe(5);
    expect(flight.toZ).toBe(-15);
    expect(flight.elapsedSeconds).toBe(0);
  });
});

describe("resolveFlightArrival", () => {
  it("stamps the receiver with the passer when the pass completes", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    const receiver = spawnPlayerAt(12, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 12, z: 0 }, "ground");
    resolveFlightArrival(world, ball());
    expect(ball().targetFor(CarriedBy)).toBe(receiver);
    expect(receiver.targetFor(LastPassFrom)).toBe(kicker);
  });
});

import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import { GoalScored } from "../events/match-events";
import { seedMatchRandom } from "../random";
import { shotConversionChance, shotGeometry, shotQuality } from "../shooting";
import {
  BallCarried,
  BallFlight,
  BallInFlight,
  BallLoose,
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
  type FlightResolutionKind,
  type PlayerRoleId,
  type TeamSideId,
} from "../traits";
import { claimBall, giveBallTo } from "./ball-control";
import { kickPass, kickShot, resolveFlightArrival } from "./kicking";

const PASSING = GAME_CONFIG.PASSING;
const SHOOTING = GAME_CONFIG.SHOOTING;
const GOAL_LINE_X = GAME_CONFIG.FIELD.LENGTH / 2;
const GOAL_HALF_WIDTH = GAME_CONFIG.GOAL.WIDTH / 2;

let world: World;

beforeEach(() => {
  world = createWorld();
  world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
});

afterEach(() => {
  world.destroy();
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

describe("kickShot", () => {
  const SHOT_POSITION = { x: GOAL_LINE_X - 9, z: 0 };

  interface ShotSample {
    kind: FlightResolutionKind;
    toX: number;
    toZ: number;
    claimant: Entity;
  }

  function spawnShooterAndKeeper() {
    const shooter = spawnPlayerAt(SHOT_POSITION.x, SHOT_POSITION.z, "home");
    const goalkeeper = spawnPlayerAt(GOAL_LINE_X - 1.5, 0, "away", "GK");
    seedMatchRandom(world, GAME_CONFIG.MATCH.SEED);
    return { shooter, goalkeeper };
  }

  function sampleShots(shooter: Entity, count: number): ShotSample[] {
    const samples: ShotSample[] = [];
    for (let attempt = 0; attempt < count; attempt += 1) {
      giveBallTo(world, shooter);
      kickShot(world, shooter);
      const resolution = ball().get(FlightResolution)!;
      const flight = ball().get(BallFlight)!;
      samples.push({
        kind: resolution.kind,
        toX: flight.toX,
        toZ: flight.toZ,
        claimant: resolution.claimant,
      });
    }
    return samples;
  }

  function kickUntil(shooter: Entity, kind: FlightResolutionKind) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      giveBallTo(world, shooter);
      kickShot(world, shooter);
      if (ball().get(FlightResolution)?.kind === kind) return;
    }
    throw new Error(`no ${kind} outcome in 200 shots`);
  }

  it("rolls goal, save and miss at the pre-resolved rates", () => {
    const { shooter } = spawnShooterAndKeeper();
    const samples = sampleShots(shooter, 400);
    const goals = samples.filter((sample) => sample.kind === "goal").length;
    const saves = samples.filter((sample) => sample.kind === "saved").length;
    const misses = samples.filter(
      (sample) => sample.kind === "offTarget",
    ).length;
    expect(goals + saves + misses).toBe(samples.length);
    expect(Math.min(goals, saves, misses)).toBeGreaterThan(0);
    const expectedConversion = shotConversionChance(
      shotQuality(shotGeometry(SHOT_POSITION, "home")),
    );
    expect(goals / samples.length).toBeCloseTo(expectedConversion, 1);
    expect(saves / (saves + misses)).toBeCloseTo(SHOOTING.OUTCOME_SAVE_SHARE, 1);
  });

  it("aims goals inside the goal mouth on the goal line", () => {
    const { shooter } = spawnShooterAndKeeper();
    const goals = sampleShots(shooter, 100).filter(
      (sample) => sample.kind === "goal",
    );
    expect(goals.length).toBeGreaterThan(0);
    goals.forEach((sample) => {
      expect(sample.toX).toBe(GOAL_LINE_X);
      expect(Math.abs(sample.toZ)).toBeLessThanOrEqual(
        GOAL_HALF_WIDTH * SHOOTING.GOAL_MOUTH_INSET,
      );
    });
  });

  it("sends saves into the goalkeeper's hands", () => {
    const { shooter, goalkeeper } = spawnShooterAndKeeper();
    const saves = sampleShots(shooter, 100).filter(
      (sample) => sample.kind === "saved",
    );
    expect(saves.length).toBeGreaterThan(0);
    saves.forEach((sample) => {
      expect(sample.claimant).toBe(goalkeeper);
      expect(sample.toX).toBeCloseTo(GOAL_LINE_X - 1.5);
      expect(sample.toZ).toBeCloseTo(0);
    });
  });

  it("puts misses wide of the posts but inside the pitch", () => {
    const { shooter } = spawnShooterAndKeeper();
    const misses = sampleShots(shooter, 100).filter(
      (sample) => sample.kind === "offTarget",
    );
    expect(misses.length).toBeGreaterThan(0);
    misses.forEach((sample) => {
      expect(Math.abs(sample.toZ)).toBeGreaterThan(GOAL_HALF_WIDTH);
      expect(sample.toX).toBe(
        GOAL_LINE_X - GAME_CONFIG.TACTICS.PITCH_CLAMP_MARGIN,
      );
      expect(Math.abs(sample.toZ)).toBeLessThanOrEqual(
        GAME_CONFIG.FIELD.WIDTH / 2 - GAME_CONFIG.TACTICS.PITCH_CLAMP_MARGIN,
      );
    });
  });

  it("ignores shots from players who are not carrying", () => {
    const { shooter } = spawnShooterAndKeeper();
    const bystander = spawnPlayerAt(30, 5, "home");
    giveBallTo(world, shooter);
    kickShot(world, bystander);
    expect(ball().has(BallCarried)).toBe(true);
    expect(shooter.has(IsCarrier)).toBe(true);
  });

  it("emits a goal and leaves the ball loose when a goal flight arrives", () => {
    const { shooter } = spawnShooterAndKeeper();
    kickUntil(shooter, "goal");
    resolveFlightArrival(world, ball());
    const goalEvents = [...world.query(GoalScored)];
    expect(goalEvents).toHaveLength(1);
    expect(goalEvents[0]!.get(GoalScored)?.side).toBe("home");
    expect(ball().has(BallLoose)).toBe(true);
  });

  it("hands a saved shot to the goalkeeper without pass memory", () => {
    const { shooter, goalkeeper } = spawnShooterAndKeeper();
    kickUntil(shooter, "saved");
    resolveFlightArrival(world, ball());
    expect(ball().targetFor(CarriedBy)).toBe(goalkeeper);
    expect(goalkeeper.targetFor(LastPassFrom)).toBeUndefined();
  });
});

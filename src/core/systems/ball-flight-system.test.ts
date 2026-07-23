import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo } from "../actions/ball-control";
import { kickPass, passSpeed } from "../actions/kicking";
import {
  BallCarried,
  BallInFlight,
  BallLoose,
  BallRoll,
  CarriedBy,
  IsBall,
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { ballFlightSystem } from "./ball-flight-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const BALL_RADIUS = GAME_CONFIG.BALL.RADIUS;
const PASSING = GAME_CONFIG.PASSING;

let world: World;

beforeEach(() => {
  world = createWorld();
  world.spawn(IsBall, Position({ x: 0, y: BALL_RADIUS, z: 0 }));
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

function tickFlight(ticks: number) {
  for (let tick = 0; tick < ticks; tick += 1) {
    ballFlightSystem(world, TICK);
  }
}

function ticksForDistance(distance: number, speed: number) {
  return Math.ceil(distance / speed / TICK) + 1;
}

describe("ballFlightSystem", () => {
  it("moves a ground pass along the line at pitch height", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 18, z: 0 }, "ground");
    const durationTicks = 18 / PASSING.GROUND_SPEED_MPS / TICK;
    tickFlight(Math.floor(durationTicks / 2));
    const midPosition = ball().get(Position)!;
    expect(midPosition.x).toBeGreaterThan(6);
    expect(midPosition.x).toBeLessThan(12);
    expect(midPosition.y).toBeCloseTo(BALL_RADIUS);
    expect(midPosition.z).toBeCloseTo(0);
  });

  it("arcs a lofted pass to its configured peak at mid flight", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 0, z: 28 }, "lofted");
    const durationTicks = 28 / PASSING.LOFTED_SPEED_MPS / TICK;
    tickFlight(Math.round(durationTicks / 2));
    const midPosition = ball().get(Position)!;
    expect(midPosition.y).toBeGreaterThan(
      BALL_RADIUS + PASSING.LOFTED_ARC_HEIGHT_M * 0.95,
    );
  });

  it("lands exactly on target and the nearby claimant takes over", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    const receiver = spawnPlayerAt(20, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 20, z: 0 }, "ground");
    tickFlight(ticksForDistance(20, PASSING.GROUND_SPEED_MPS));
    expect(ball().has(BallCarried)).toBe(true);
    expect(ball().targetFor(CarriedBy)).toBe(receiver);
    const position = ball().get(Position)!;
    expect(position.y).toBeCloseTo(BALL_RADIUS);
  });

  it("drops the ball loose with landing roll when nobody can reach it", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(-30, 0, "home");
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 24, z: 0 }, "ground");
    tickFlight(ticksForDistance(24, PASSING.GROUND_SPEED_MPS));
    expect(ball().has(BallLoose)).toBe(true);
    expect(ball().has(BallInFlight)).toBe(false);
    const roll = ball().get(BallRoll)!;
    expect(roll.vx).toBeCloseTo(
      passSpeed("ground") * PASSING.LANDING_ROLL_FACTOR,
    );
    expect(roll.vz).toBeCloseTo(0);
  });

  it("does nothing when no ball is in flight", () => {
    ballFlightSystem(world, TICK);
    const position = ball().get(Position)!;
    expect(position.x).toBe(0);
    expect(position.z).toBe(0);
  });
});

import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo } from "../actions/ball-control";
import { seedMatchRandom } from "../random";
import {
  BallLoose,
  BallRoll,
  CarriedBy,
  ClaimLockout,
  ContestTimer,
  IsBall,
  IsCarrier,
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { ballContestSystem } from "./ball-contest-system";
import { looseBallSystem } from "./loose-ball-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const PRESSURE = GAME_CONFIG.PRESSURE;
const TICKS_PER_CONTEST = Math.ceil(PRESSURE.CONTEST_INTERVAL_SECONDS / TICK);

let world: World;

beforeEach(() => {
  world = createWorld();
  seedMatchRandom(world, GAME_CONFIG.MATCH.SEED);
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

function runContestTicks(tickCount: number) {
  for (let tick = 0; tick < tickCount; tick += 1) {
    ballContestSystem(world, TICK);
  }
}

function runContestUntilLoose(maxTicks: number): boolean {
  for (let tick = 0; tick < maxTicks; tick += 1) {
    ballContestSystem(world, TICK);
    if (ball().has(BallLoose)) return true;
  }
  return false;
}

describe("ballContestSystem", () => {
  it("leaves an unchallenged carrier alone", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(PRESSURE.TACKLE_RADIUS_M + 2, 0, "away");
    giveBallTo(world, carrier);
    runContestTicks(TICKS_PER_CONTEST * 3);
    expect(carrier.has(ContestTimer)).toBe(false);
    expect(carrier.has(IsCarrier)).toBe(true);
  });

  it("arms a contest timer while an opponent is inside the tackle radius", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(1, 0, "away");
    giveBallTo(world, carrier);
    ballContestSystem(world, TICK);
    expect(carrier.get(ContestTimer)?.remainingSeconds).toBeCloseTo(
      PRESSURE.CONTEST_INTERVAL_SECONDS - TICK,
    );
  });

  it("resets the contest when the opponent backs off", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const challenger = spawnPlayerAt(1, 0, "away");
    giveBallTo(world, carrier);
    runContestTicks(3);
    challenger.set(Position, { x: 20, y: 0, z: 0 });
    ballContestSystem(world, TICK);
    expect(carrier.has(ContestTimer)).toBe(false);
    expect(carrier.has(IsCarrier)).toBe(true);
  });

  it("eventually dispossesses a carrier who stays contested", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(1, 0, "away");
    giveBallTo(world, carrier);
    const wentLoose = runContestUntilLoose(TICKS_PER_CONTEST * 40);
    expect(wentLoose).toBe(true);
    expect(carrier.has(IsCarrier)).toBe(false);
    expect(carrier.has(ContestTimer)).toBe(false);
    expect(carrier.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(
      PRESSURE.CLAIM_LOCKOUT_SECONDS,
    );
    const roll = ball().get(BallRoll)!;
    const squirtSpeed = Math.hypot(roll.vx, roll.vz);
    expect(squirtSpeed).toBeGreaterThanOrEqual(PRESSURE.SQUIRT_SPEED_MIN_MPS);
    expect(squirtSpeed).toBeLessThanOrEqual(PRESSURE.SQUIRT_SPEED_MAX_MPS);
  });

  it("hands the scramble to the challenger while the victim is locked out", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const challenger = spawnPlayerAt(1, 0, "away");
    giveBallTo(world, carrier);
    runContestUntilLoose(TICKS_PER_CONTEST * 40);
    looseBallSystem(world, TICK);
    expect(ball().targetFor(CarriedBy)).toBe(challenger);
  });

  it("expires claim lockouts", () => {
    const player = spawnPlayerAt(0, 0, "home");
    player.add(ClaimLockout({ remainingSeconds: TICK * 2 }));
    runContestTicks(3);
    expect(player.has(ClaimLockout)).toBe(false);
  });
});

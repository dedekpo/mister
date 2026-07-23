import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo, releaseBallLoose } from "../actions/ball-control";
import { kickPass } from "../actions/kicking";
import { gameplayEventPhase } from "../events/gameplay-event-phase";
import {
  BallCarried,
  BallLoose,
  BallRoll,
  CarriedBy,
  IsBall,
  IsCarrier,
  IsPlayer,
  PlayerRole,
  Position,
  Possession,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { ballCarrySystem } from "./ball-carry-system";
import { ballDutyMovementSystem } from "./ball-duty-movement-system";
import { ballDutySystem } from "./ball-duty-system";
import { ballFlightSystem } from "./ball-flight-system";
import { looseBallSystem } from "./loose-ball-system";
import { movementSystem } from "./movement-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const LOOSE_BALL = GAME_CONFIG.LOOSE_BALL;

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

describe("rolling", () => {
  it("advances the ball and decays its speed", () => {
    releaseBallLoose(world, { vx: 6, vz: 0 });
    looseBallSystem(world, TICK);
    const position = ball().get(Position)!;
    expect(position.x).toBeCloseTo(6 * TICK);
    const roll = ball().get(BallRoll)!;
    expect(roll.vx).toBeLessThan(6);
    expect(roll.vx).toBeGreaterThan(6 * 0.9);
  });

  it("comes to rest below the minimum roll speed", () => {
    releaseBallLoose(world, {
      vx: LOOSE_BALL.MIN_ROLL_SPEED_MPS / 2,
      vz: 0,
    });
    looseBallSystem(world, TICK);
    const roll = ball().get(BallRoll)!;
    expect(roll.vx).toBe(0);
    const position = ball().get(Position)!;
    expect(position.x).toBe(0);
  });
});

describe("claiming", () => {
  it("lets the nearest player within reach claim the ball", () => {
    const claimer = spawnPlayerAt(0.5, 0, "away");
    spawnPlayerAt(3, 0, "home");
    releaseBallLoose(world, { vx: 0, vz: 0 });
    looseBallSystem(world, TICK);
    expect(ball().has(BallCarried)).toBe(true);
    expect(ball().has(BallLoose)).toBe(false);
    expect(ball().has(BallRoll)).toBe(false);
    expect(ball().targetFor(CarriedBy)).toBe(claimer);
    expect(claimer.has(IsCarrier)).toBe(true);
  });

  it("leaves the ball loose when nobody is in reach", () => {
    spawnPlayerAt(5, 0, "home");
    releaseBallLoose(world, { vx: 0, vz: 0 });
    looseBallSystem(world, TICK);
    expect(ball().has(BallLoose)).toBe(true);
  });
});

describe("the footrace", () => {
  it("ends with the nearest chaser claiming and possession flipping", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(-20, 0, "home");
    const racer = spawnPlayerAt(30, 6, "away");
    giveBallTo(world, kicker);
    gameplayEventPhase(world);
    kickPass(world, kicker, { x: 26, z: 0 }, "ground");
    for (let tick = 0; tick < 600; tick += 1) {
      ballDutySystem(world, TICK);
      ballDutyMovementSystem(world);
      movementSystem(world, TICK);
      ballCarrySystem(world);
      ballFlightSystem(world, TICK);
      looseBallSystem(world, TICK);
      gameplayEventPhase(world);
      if (ball().has(BallCarried)) break;
    }
    expect(ball().has(BallCarried)).toBe(true);
    expect(ball().targetFor(CarriedBy)).toBe(racer);
    expect(world.get(Possession)?.side).toBe("away");
  });
});

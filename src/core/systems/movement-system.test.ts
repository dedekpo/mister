import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import {
  IsPlayer,
  DribbleSpeedFactor,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
} from "../traits";
import { movementSystem } from "./movement-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const RUN_SPEED = GAME_CONFIG.PLAYER.RUN_SPEED_MPS;

let world: World;

beforeEach(() => {
  world = createWorld();
});

afterEach(() => {
  world.destroy();
});

function spawnRunnerTowards(targetX: number): Entity {
  return world.spawn(
    IsPlayer,
    TeamSide({ side: "home" }),
    PlayerRole({ role: "CM" }),
    Position({ x: 0, y: 0, z: 0 }),
    TargetPosition({ x: targetX, z: 0 }),
    Speed({ metersPerSecond: RUN_SPEED }),
  );
}

describe("movementSystem dribble speed factor", () => {
  it("moves at full speed without a factor", () => {
    const runner = spawnRunnerTowards(10);
    movementSystem(world, TICK);
    expect(runner.get(Position)!.x).toBeCloseTo(RUN_SPEED * TICK);
  });

  it("scales the step by the dribble speed factor", () => {
    const factor = GAME_CONFIG.DRIBBLING.SPEED_FACTOR;
    const runner = spawnRunnerTowards(10);
    runner.add(DribbleSpeedFactor({ factor }));
    movementSystem(world, TICK);
    expect(runner.get(Position)!.x).toBeCloseTo(RUN_SPEED * factor * TICK);
  });
});

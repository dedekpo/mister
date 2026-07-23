import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../data/game-config";
import { isUnderTacklePressure, pressureOn } from "./pressure";
import {
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "./traits";

const PRESSURE = GAME_CONFIG.PRESSURE;

let world: World;

beforeEach(() => {
  world = createWorld();
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

describe("pressureOn", () => {
  it("falls off linearly from contact to the pressure radius", () => {
    const player = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(PRESSURE.RADIUS_M / 2, 0, "away");
    expect(pressureOn(world, player)).toBeCloseTo(0.5);
  });

  it("is zero beyond the pressure radius", () => {
    const player = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(PRESSURE.RADIUS_M + 1, 0, "away");
    expect(pressureOn(world, player)).toBe(0);
  });

  it("saturates at one for an adjacent opponent", () => {
    const player = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(0, 0, "away");
    expect(pressureOn(world, player)).toBe(1);
  });

  it("ignores teammates and is zero with nobody to press", () => {
    const player = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(0.5, 0, "home");
    expect(pressureOn(world, player)).toBe(0);
  });
});

describe("isUnderTacklePressure", () => {
  it("is true inside the tackle radius", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(PRESSURE.TACKLE_RADIUS_M - 0.1, 0, "away");
    expect(isUnderTacklePressure(world, carrier)).toBe(true);
  });

  it("is false outside the tackle radius", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(PRESSURE.TACKLE_RADIUS_M + 0.1, 0, "away");
    expect(isUnderTacklePressure(world, carrier)).toBe(false);
  });
});

import { createWorld, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo } from "../actions/ball-control";
import {
  IsBall,
  IsPlayer,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { ballCarrySystem } from "./ball-carry-system";

const CARRY_OFFSET_M = GAME_CONFIG.BALL_CONTROL.CARRY_OFFSET_M;

let world: World;

function spawnCarrierAt(x: number, z: number, side: TeamSideId) {
  const player = world.spawn(
    IsPlayer,
    TeamSide({ side }),
    Position({ x, y: 0, z }),
    TargetPosition({ x, z }),
    Speed({ metersPerSecond: GAME_CONFIG.PLAYER.RUN_SPEED_MPS }),
  );
  world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
  giveBallTo(world, player);
  return player;
}

function ballPosition() {
  return world.queryFirst(IsBall)!.get(Position)!;
}

beforeEach(() => {
  world = createWorld();
});

describe("ballCarrySystem", () => {
  it("keeps the ball ahead of a moving carrier", () => {
    const player = spawnCarrierAt(10, 5, "home");
    player.set(TargetPosition, { x: 10, z: 15 });
    ballCarrySystem(world);
    const position = ballPosition();
    expect(position.x).toBeCloseTo(10);
    expect(position.z).toBeCloseTo(5 + CARRY_OFFSET_M);
    expect(position.y).toBeCloseTo(GAME_CONFIG.BALL.RADIUS);
  });

  it("points the ball at the opponent goal when the carrier is idle", () => {
    spawnCarrierAt(10, 5, "away");
    ballCarrySystem(world);
    const position = ballPosition();
    expect(position.x).toBeCloseTo(10 - CARRY_OFFSET_M);
    expect(position.z).toBeCloseTo(5);
  });

  it("does nothing when the ball is not carried", () => {
    world.spawn(IsBall, Position({ x: 3, y: GAME_CONFIG.BALL.RADIUS, z: 4 }));
    ballCarrySystem(world);
    const position = ballPosition();
    expect(position.x).toBe(3);
    expect(position.z).toBe(4);
  });
});

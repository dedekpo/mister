import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo, startDribble, stopDribble } from "../actions/ball-control";
import {
  IsBall,
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { ballDutyMovementSystem } from "./ball-duty-movement-system";

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

describe("ballDutyMovementSystem carrier steering", () => {
  it("pins a non-dribbling carrier to their own position", () => {
    const carrier = spawnPlayerAt(5, 5, "home");
    giveBallTo(world, carrier);
    carrier.set(TargetPosition, { x: 20, z: 20 });
    ballDutyMovementSystem(world);
    expect(carrier.get(TargetPosition)).toEqual({ x: 5, z: 5 });
  });

  it("steers a dribbling carrier toward the dribble target", () => {
    const carrier = spawnPlayerAt(5, 5, "home");
    giveBallTo(world, carrier);
    startDribble(carrier, { x: 13, z: 5 });
    ballDutyMovementSystem(world);
    expect(carrier.get(TargetPosition)).toEqual({ x: 13, z: 5 });
  });

  it("re-pins the carrier after the dribble stops", () => {
    const carrier = spawnPlayerAt(5, 5, "home");
    giveBallTo(world, carrier);
    startDribble(carrier, { x: 13, z: 5 });
    ballDutyMovementSystem(world);
    stopDribble(carrier);
    ballDutyMovementSystem(world);
    expect(carrier.get(TargetPosition)).toEqual({ x: 5, z: 5 });
  });
});

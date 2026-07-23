import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import { giveBallTo, releaseBallLoose } from "../actions/ball-control";
import { kickPass } from "../actions/kicking";
import {
  IsBall,
  IsChaser,
  IsPlayer,
  IsReceiver,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type PlayerRoleId,
  type TeamSideId,
} from "../traits";
import { ballDutySystem } from "./ball-duty-system";

const TICK = GAME_CONFIG.SIMULATION.TICK_SECONDS;
const REASSIGN_SECONDS = GAME_CONFIG.DUTIES.CHASE_REASSIGN_SECONDS;

let world: World;

beforeEach(() => {
  world = createWorld();
  world.spawn(IsBall, Position({ x: 0, y: GAME_CONFIG.BALL.RADIUS, z: 0 }));
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

function chasers(): Entity[] {
  return [...world.query(IsChaser)];
}

describe("in-flight duties", () => {
  it("tags the planned claimant as receiver and clears chasers", () => {
    const kicker = spawnPlayerAt(0, 0, "home");
    const receiver = spawnPlayerAt(20, 0, "home");
    const opponent = spawnPlayerAt(18, 4, "away");
    opponent.add(IsChaser);
    giveBallTo(world, kicker);
    kickPass(world, kicker, { x: 20, z: 2 }, "ground");
    ballDutySystem(world, TICK);
    expect(receiver.has(IsReceiver)).toBe(true);
    expect(kicker.has(IsReceiver)).toBe(false);
    expect(chasers()).toHaveLength(0);
  });
});

describe("carried duties", () => {
  it("clears every duty while the ball is held", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const teammate = spawnPlayerAt(10, 0, "home");
    teammate.add(IsReceiver);
    spawnPlayerAt(5, 5, "away").add(IsChaser);
    giveBallTo(world, carrier);
    ballDutySystem(world, TICK);
    expect([...world.query(IsReceiver)]).toHaveLength(0);
    expect(chasers()).toHaveLength(0);
  });
});

describe("loose-ball duties", () => {
  it("assigns the nearest outfield players per side as chasers", () => {
    const homeNear = spawnPlayerAt(2, 0, "home");
    const homeAlso = spawnPlayerAt(4, 0, "home");
    spawnPlayerAt(30, 0, "home");
    const awayNear = spawnPlayerAt(-3, 0, "away");
    const awayAlso = spawnPlayerAt(-5, 0, "away");
    spawnPlayerAt(-40, 0, "away");
    releaseBallLoose(world, { vx: 0, vz: 0 });
    ballDutySystem(world, TICK);
    expect(new Set(chasers())).toEqual(
      new Set([homeNear, homeAlso, awayNear, awayAlso]),
    );
  });

  it("never sends the goalkeeper chasing", () => {
    const goalkeeper = spawnPlayerAt(1, 0, "home", "GK");
    const outfielder = spawnPlayerAt(8, 0, "home");
    releaseBallLoose(world, { vx: 0, vz: 0 });
    ballDutySystem(world, TICK);
    expect(goalkeeper.has(IsChaser)).toBe(false);
    expect(outfielder.has(IsChaser)).toBe(true);
  });

  it("keeps assignments stable until the reassign cooldown elapses", () => {
    const first = spawnPlayerAt(2, 0, "home");
    const second = spawnPlayerAt(6, 0, "home");
    releaseBallLoose(world, { vx: 0, vz: 0 });
    ballDutySystem(world, TICK);
    expect(first.has(IsChaser)).toBe(true);
    second.set(Position, { x: 0.5, y: 0, z: 0 });
    first.set(Position, { x: 20, y: 0, z: 0 });
    ballDutySystem(world, TICK);
    expect(first.has(IsChaser)).toBe(true);
    const ticksToElapse = Math.ceil(REASSIGN_SECONDS / TICK) + 1;
    for (let tick = 0; tick < ticksToElapse; tick += 1) {
      ballDutySystem(world, TICK);
    }
    expect(second.has(IsChaser)).toBe(true);
  });
});

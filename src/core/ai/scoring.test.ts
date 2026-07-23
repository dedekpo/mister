import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import {
  IsPlayer,
  LastPassFrom,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import { shotGeometry, shotQuality } from "../shooting";
import type { DribbleCandidate, PassCandidate } from "./candidates";
import { scoreCarrierCandidate } from "./scoring";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const CLEARING = GAME_CONFIG.CLEARING;
const GOAL_LINE_X = GAME_CONFIG.FIELD.LENGTH / 2;

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

function passTo(receiver: Entity): PassCandidate {
  const position = receiver.get(Position)!;
  return {
    kind: "pass",
    receiver,
    target: { x: position.x, z: position.z },
    flavor: "ground",
  };
}

function dribbleTo(x: number, z: number): DribbleCandidate {
  return { kind: "dribble", target: { x, z } };
}

describe("scoreCarrierCandidate", () => {
  it("scores hold as the zero baseline", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    expect(scoreCarrierCandidate(world, carrier, { kind: "hold" })).toBe(0);
  });

  it("prefers an open receiver over a marked one", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const openTeammate = spawnPlayerAt(15, 10, "home");
    const markedTeammate = spawnPlayerAt(15, -10, "home");
    spawnPlayerAt(15, -11, "away");
    spawnPlayerAt(15, 10 + CARRIER_AI.OPENNESS_CAP_M + 5, "away");
    const openScore = scoreCarrierCandidate(world, carrier, passTo(openTeammate));
    const markedScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(markedTeammate),
    );
    expect(openScore).toBeGreaterThan(markedScore);
  });

  it("prefers forward passes at equal openness", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const forwardTeammate = spawnPlayerAt(15, 0, "home");
    const backwardTeammate = spawnPlayerAt(-15, 0, "home");
    const forwardScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(forwardTeammate),
    );
    const backwardScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(backwardTeammate),
    );
    expect(forwardScore).toBeGreaterThan(backwardScore);
  });

  it("mirrors progression for the away side", () => {
    const carrier = spawnPlayerAt(0, 0, "away");
    const forwardForAway = spawnPlayerAt(-15, 0, "away");
    const backwardForAway = spawnPlayerAt(15, 0, "away");
    const forwardScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(forwardForAway),
    );
    const backwardScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(backwardForAway),
    );
    expect(forwardScore).toBeGreaterThan(backwardScore);
  });

  it("avoids passes through guarded lanes", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const clearLaneTeammate = spawnPlayerAt(20, 10, "home");
    const guardedLaneTeammate = spawnPlayerAt(20, -10, "home");
    spawnPlayerAt(10, -5, "away");
    const clearScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(clearLaneTeammate),
    );
    const guardedScore = scoreCarrierCandidate(
      world,
      carrier,
      passTo(guardedLaneTeammate),
    );
    expect(clearScore).toBeGreaterThan(guardedScore);
  });

  it("penalizes returning the ball to the last passer", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const teammate = spawnPlayerAt(15, 0, "home");
    const freshScore = scoreCarrierCandidate(world, carrier, passTo(teammate));
    carrier.add(LastPassFrom(teammate));
    const returnScore = scoreCarrierCandidate(world, carrier, passTo(teammate));
    expect(freshScore - returnScore).toBeCloseTo(
      CARRIER_AI.WEIGHT_BACKPASS_PENALTY,
    );
  });
});

describe("dribble scoring", () => {
  it("prefers probes into open space over crowded ones", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(8, 2, "away");
    const crowdedScore = scoreCarrierCandidate(world, carrier, dribbleTo(8, 0));
    const openScore = scoreCarrierCandidate(world, carrier, dribbleTo(8, -10));
    expect(openScore).toBeGreaterThan(crowdedScore);
  });

  it("prefers forward probes at equal space", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const forwardScore = scoreCarrierCandidate(world, carrier, dribbleTo(8, 0));
    const sidewaysScore = scoreCarrierCandidate(
      world,
      carrier,
      dribbleTo(0, 8),
    );
    expect(forwardScore).toBeGreaterThan(sidewaysScore);
  });

  it("boosts escaping into open space while pressured", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const calmScore = scoreCarrierCandidate(world, carrier, dribbleTo(8, 0));
    spawnPlayerAt(-2, 0, "away");
    const pressuredScore = scoreCarrierCandidate(
      world,
      carrier,
      dribbleTo(8, 0),
    );
    expect(pressuredScore).toBeGreaterThan(calmScore);
  });

  it("flips the choice from a pass to an escape dribble under pressure", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const teammate = spawnPlayerAt(15, 0, "home");
    const calmPass = scoreCarrierCandidate(world, carrier, passTo(teammate));
    const calmDribble = scoreCarrierCandidate(world, carrier, dribbleTo(8, 0));
    expect(calmPass).toBeGreaterThan(calmDribble);
    spawnPlayerAt(-2, 0, "away");
    const pressuredPass = scoreCarrierCandidate(
      world,
      carrier,
      passTo(teammate),
    );
    const pressuredDribble = scoreCarrierCandidate(
      world,
      carrier,
      dribbleTo(8, 0),
    );
    expect(pressuredDribble).toBeGreaterThan(pressuredPass);
  });
});

describe("clear scoring", () => {
  const clearCandidate = { kind: "clear", target: { x: 0, z: 0 } } as const;

  it("beats hold when pressured deep in the own third", () => {
    const carrier = spawnPlayerAt(-48, 0, "home");
    spawnPlayerAt(-47.5, 0, "away");
    expect(scoreCarrierCandidate(world, carrier, clearCandidate)).toBeGreaterThan(
      0,
    );
  });

  it("stays below hold when unpressured", () => {
    const carrier = spawnPlayerAt(-48, 0, "home");
    expect(scoreCarrierCandidate(world, carrier, clearCandidate)).toBe(
      CLEARING.BASE_SCORE,
    );
  });

  it("stays below hold when pressured outside the panic third", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(0.5, 0, "away");
    expect(scoreCarrierCandidate(world, carrier, clearCandidate)).toBe(
      CLEARING.BASE_SCORE,
    );
  });
});

describe("shot scoring", () => {
  const shootCandidate = { kind: "shoot" } as const;

  it("scores a shot by its weighted chance quality", () => {
    const shooterX = GOAL_LINE_X - 10;
    const carrier = spawnPlayerAt(shooterX, 0, "home");
    expect(scoreCarrierCandidate(world, carrier, shootCandidate)).toBeCloseTo(
      GAME_CONFIG.SHOOTING.WEIGHT_QUALITY *
        shotQuality(shotGeometry({ x: shooterX, z: 0 }, "home")),
    );
  });

  it("prefers close central shots over long wide ones", () => {
    const centralShooter = spawnPlayerAt(GOAL_LINE_X - 9, 0, "home");
    const wideShooter = spawnPlayerAt(GOAL_LINE_X - 20, 14, "home");
    expect(
      scoreCarrierCandidate(world, centralShooter, shootCandidate),
    ).toBeGreaterThan(scoreCarrierCandidate(world, wideShooter, shootCandidate));
  });
});

import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
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
import type { PassCandidate } from "./candidates";
import { scoreCarrierCandidate } from "./scoring";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;

let world: World;

beforeEach(() => {
  world = createWorld();
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

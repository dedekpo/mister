import { createWorld, type Entity, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import {
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "../traits";
import {
  generateCarrierCandidates,
  type PassCandidate,
} from "./candidates";

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

function passCandidates(carrier: Entity): PassCandidate[] {
  return generateCarrierCandidates(world, carrier).filter(
    (candidate): candidate is PassCandidate => candidate.kind === "pass",
  );
}

describe("generateCarrierCandidates", () => {
  it("always offers hold", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const kinds = generateCarrierCandidates(world, carrier).map(
      (candidate) => candidate.kind,
    );
    expect(kinds).toContain("hold");
  });

  it("picks the flavor from the pass distance", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    const shortTeammate = spawnPlayerAt(CARRIER_AI.GROUND_MAX_RANGE_M - 5, 0, "home");
    const longTeammate = spawnPlayerAt(CARRIER_AI.LOFTED_MAX_RANGE_M - 5, 0, "home");
    const candidates = passCandidates(carrier);
    expect(
      candidates.find((candidate) => candidate.receiver === shortTeammate)
        ?.flavor,
    ).toBe("ground");
    expect(
      candidates.find((candidate) => candidate.receiver === longTeammate)
        ?.flavor,
    ).toBe("lofted");
  });

  it("skips teammates beyond lofted range or closer than the minimum", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(CARRIER_AI.LOFTED_MAX_RANGE_M + 5, 0, "home");
    spawnPlayerAt(GAME_CONFIG.PASSING.MIN_DISTANCE_M / 2, 0, "home");
    expect(passCandidates(carrier)).toHaveLength(0);
  });

  it("never targets opponents or the carrier itself", () => {
    const carrier = spawnPlayerAt(0, 0, "home");
    spawnPlayerAt(10, 0, "away");
    const teammate = spawnPlayerAt(10, 5, "home");
    const receivers = passCandidates(carrier).map(
      (candidate) => candidate.receiver,
    );
    expect(receivers).toEqual([teammate]);
  });
});

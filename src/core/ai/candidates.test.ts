import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../data/game-config";
import {
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type PlayerRoleId,
  type TeamSideId,
} from "../traits";
import {
  generateCarrierCandidates,
  type ClearCandidate,
  type DribbleCandidate,
  type PassCandidate,
} from "./candidates";

const CARRIER_AI = GAME_CONFIG.CARRIER_AI;
const DRIBBLING = GAME_CONFIG.DRIBBLING;
const CLEARING = GAME_CONFIG.CLEARING;
const PITCH_MARGIN_M = GAME_CONFIG.TACTICS.PITCH_CLAMP_MARGIN;

let world: World;

beforeEach(() => {
  world = createWorld();
});

afterEach(() => {
  world.destroy();
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

function passCandidates(carrier: Entity): PassCandidate[] {
  return generateCarrierCandidates(world, carrier).filter(
    (candidate): candidate is PassCandidate => candidate.kind === "pass",
  );
}

function dribbleCandidates(carrier: Entity): DribbleCandidate[] {
  return generateCarrierCandidates(world, carrier).filter(
    (candidate): candidate is DribbleCandidate => candidate.kind === "dribble",
  );
}

function clearCandidates(carrier: Entity): ClearCandidate[] {
  return generateCarrierCandidates(world, carrier).filter(
    (candidate): candidate is ClearCandidate => candidate.kind === "clear",
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

  it("fans dribble probes toward the opponent goal", () => {
    const homeCarrier = spawnPlayerAt(0, 0, "home");
    const homeProbes = dribbleCandidates(homeCarrier);
    expect(homeProbes).toHaveLength(DRIBBLING.PROBE_ANGLES_DEG.length);
    homeProbes.forEach((probe) => expect(probe.target.x).toBeGreaterThan(0));
    const awayCarrier = spawnPlayerAt(0, 0, "away");
    dribbleCandidates(awayCarrier).forEach((probe) =>
      expect(probe.target.x).toBeLessThan(0),
    );
  });

  it("drops dribble probes that leave the pitch", () => {
    const nearTouchlineZ = GAME_CONFIG.FIELD.WIDTH / 2 - PITCH_MARGIN_M - 2;
    const carrier = spawnPlayerAt(0, nearTouchlineZ, "home");
    const probes = dribbleCandidates(carrier);
    expect(probes.length).toBeLessThan(DRIBBLING.PROBE_ANGLES_DEG.length);
    expect(probes.length).toBeGreaterThan(0);
  });

  it("offers goalkeepers no dribble probes but keeps the clear", () => {
    const goalkeeper = spawnPlayerAt(-50, 0, "home", "GK");
    expect(dribbleCandidates(goalkeeper)).toHaveLength(0);
    expect(clearCandidates(goalkeeper)).toHaveLength(1);
  });

  it("aims the clear upfield and keeps it inside the pitch", () => {
    const deepCarrier = spawnPlayerAt(-40, 5, "home");
    expect(clearCandidates(deepCarrier)[0]?.target).toEqual({
      x: -40 + CLEARING.DISTANCE_M,
      z: 5,
    });
    const advancedCarrier = spawnPlayerAt(30, 0, "home");
    expect(clearCandidates(advancedCarrier)[0]?.target.x).toBe(
      GAME_CONFIG.FIELD.LENGTH / 2 - PITCH_MARGIN_M,
    );
  });
});

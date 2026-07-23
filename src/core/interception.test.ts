import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../data/game-config";
import {
  combinedInterceptionChance,
  findLaneThreats,
  likeliestInterceptor,
  type LaneThreat,
} from "./interception";
import {
  IsPlayer,
  PlayerRole,
  Position,
  Speed,
  TargetPosition,
  TeamSide,
  type TeamSideId,
} from "./traits";

const INTERCEPTION = GAME_CONFIG.INTERCEPTION;
const LANE = { from: { x: 0, z: 0 }, to: { x: 20, z: 0 } };

let world: World;

beforeEach(() => {
  world = createWorld();
});

afterEach(() => {
  world.destroy();
});

function resetWorld() {
  world.destroy();
  world = createWorld();
}

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

function threatsOnLane(): LaneThreat[] {
  return findLaneThreats(world, LANE.from, LANE.to, "home");
}

function fakeThreat(chance: number): LaneThreat {
  return {
    opponent: 0 as Entity,
    interceptPoint: { x: 0, z: 0 },
    laneProgress: 0,
    chance,
  };
}

describe("findLaneThreats", () => {
  it("ignores opponents outside the lane radius and every teammate", () => {
    spawnPlayerAt(10, INTERCEPTION.LANE_RADIUS_M + 0.1, "away");
    spawnPlayerAt(10, 0, "home");
    expect(threatsOnLane()).toHaveLength(0);
  });

  it("projects the cut point onto the lane", () => {
    const opponent = spawnPlayerAt(10, 1, "away");
    const threats = threatsOnLane();
    expect(threats).toHaveLength(1);
    expect(threats[0].opponent).toBe(opponent);
    expect(threats[0].interceptPoint.x).toBeCloseTo(10);
    expect(threats[0].interceptPoint.z).toBeCloseTo(0);
    expect(threats[0].laneProgress).toBeCloseTo(0.5);
  });

  it("threatens more the closer the opponent hugs the lane", () => {
    spawnPlayerAt(10, 0.5, "away");
    const [nearLane] = threatsOnLane();
    resetWorld();
    spawnPlayerAt(10, 2.5, "away");
    const [farFromLane] = threatsOnLane();
    expect(nearLane.chance).toBeGreaterThan(farFromLane.chance);
  });

  it("ignores an opponent parked behind the passer", () => {
    spawnPlayerAt(-1, 0, "away");
    expect(threatsOnLane()).toHaveLength(0);
  });

  it("ignores an opponent already marking the receiver", () => {
    spawnPlayerAt(21, 0, "away");
    expect(threatsOnLane()).toHaveLength(0);
  });

  it("ignores an opponent inside the lane entry margin", () => {
    spawnPlayerAt(INTERCEPTION.LANE_ENTRY_MARGIN_M - 0.1, 0, "away");
    expect(threatsOnLane()).toHaveLength(0);
  });

  it("catches an opponent just past the lane entry margin", () => {
    spawnPlayerAt(INTERCEPTION.LANE_ENTRY_MARGIN_M + 0.1, 0, "away");
    expect(threatsOnLane()).toHaveLength(1);
  });

  it("finds no threats on a lane too short to be cut", () => {
    spawnPlayerAt(1, 0, "away");
    const shortLane = findLaneThreats(
      world,
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      "home",
    );
    expect(shortLane).toHaveLength(0);
  });

  it("threatens more the earlier the cut point sits on the lane", () => {
    spawnPlayerAt(4, 1, "away");
    const [early] = threatsOnLane();
    resetWorld();
    spawnPlayerAt(16, 1, "away");
    const [late] = threatsOnLane();
    expect(early.laneProgress).toBeLessThan(late.laneProgress);
    expect(early.chance).toBeGreaterThan(late.chance);
  });
});

describe("laneThreatChance", () => {
  it("never exceeds a certainty for a threat hugging the lane", () => {
    spawnPlayerAt(2.5, 0, "away");
    const [hugger] = threatsOnLane();
    expect(hugger.chance).toBeLessThanOrEqual(1);
    expect(hugger.chance).toBeGreaterThan(0);
  });
});

describe("combinedInterceptionChance", () => {
  it("is zero without threats", () => {
    expect(combinedInterceptionChance([])).toBe(0);
  });

  it("stacks independent threats", () => {
    expect(
      combinedInterceptionChance([fakeThreat(0.5), fakeThreat(0.5)]),
    ).toBeCloseTo(0.75);
  });

  it("never exceeds one", () => {
    const chance = combinedInterceptionChance([
      fakeThreat(0.9),
      fakeThreat(0.9),
      fakeThreat(0.9),
    ]);
    expect(chance).toBeLessThanOrEqual(1);
    expect(chance).toBeGreaterThan(0.9);
  });
});

describe("likeliestInterceptor", () => {
  it("picks the highest-chance threat", () => {
    const bystander = spawnPlayerAt(10, 2.5, "away");
    const hugger = spawnPlayerAt(10, 0.2, "away");
    const threats = threatsOnLane();
    expect(threats).toHaveLength(2);
    const likeliest = likeliestInterceptor(threats)!;
    expect(likeliest.opponent).toBe(hugger);
    expect(likeliest.opponent).not.toBe(bystander);
  });

  it("returns undefined without threats", () => {
    expect(likeliestInterceptor([])).toBeUndefined();
  });
});

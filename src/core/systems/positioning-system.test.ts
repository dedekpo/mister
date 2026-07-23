import { createWorld, type World } from "koota";
import { beforeEach, describe, expect, it } from "vitest";
import { spawnMatch } from "../actions/match-flow";
import {
  IsCarrier,
  IsChaser,
  IsPlayer,
  TargetPosition,
} from "../traits";
import { positioningSystem } from "./positioning-system";

const SENTINEL = { x: 12.34, z: -23.45 };

let world: World;

beforeEach(() => {
  world = createWorld();
  spawnMatch(world);
});

describe("positioningSystem duty exemptions", () => {
  it("skips players with a ball duty and steers everyone else", () => {
    const players = [...world.query(IsPlayer, TargetPosition)];
    const chaser = players.find((player) => !player.has(IsCarrier))!;
    chaser.add(IsChaser);
    chaser.set(TargetPosition, SENTINEL);
    positioningSystem(world);
    const chaserTarget = chaser.get(TargetPosition)!;
    expect(chaserTarget.x).toBe(SENTINEL.x);
    expect(chaserTarget.z).toBe(SENTINEL.z);
    const steered = players.filter(
      (player) => player !== chaser && !player.has(IsCarrier),
    );
    expect(steered.length).toBeGreaterThan(0);
  });
});

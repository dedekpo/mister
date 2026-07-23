import { createWorld, type Entity, type World } from "koota";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expireCountdowns, tickCountdown } from "./countdown";
import { ClaimLockout } from "./traits";

let world: World;

beforeEach(() => {
  world = createWorld();
});

afterEach(() => {
  world.destroy();
});

function spawnLockedOut(remainingSeconds: number): Entity {
  return world.spawn(ClaimLockout({ remainingSeconds }));
}

describe("tickCountdown", () => {
  it("arms an absent countdown from the unarmed value", () => {
    const entity = world.spawn();
    expect(tickCountdown(entity, ClaimLockout, 0.1, 1)).toBe(false);
    expect(entity.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(0.9);
  });

  it("reports an absent countdown with no unarmed value as expired", () => {
    const entity = world.spawn();
    expect(tickCountdown(entity, ClaimLockout, 0.1)).toBe(true);
    expect(entity.has(ClaimLockout)).toBe(false);
  });

  it("drains an armed countdown without removing it", () => {
    const entity = spawnLockedOut(0.5);
    expect(tickCountdown(entity, ClaimLockout, 0.2)).toBe(false);
    expect(entity.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(0.3);
  });

  it("reports expiry once the remainder hits zero and stops writing", () => {
    const entity = spawnLockedOut(0.2);
    expect(tickCountdown(entity, ClaimLockout, 0.2)).toBe(true);
    expect(entity.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(0.2);
  });

  it("ticks a world-scoped countdown", () => {
    expect(tickCountdown(world, ClaimLockout, 0.1, 1)).toBe(false);
    expect(world.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(0.9);
  });
});

describe("expireCountdowns", () => {
  it("removes only the countdowns that reached zero", () => {
    const expiring = spawnLockedOut(0.1);
    const surviving = spawnLockedOut(0.5);
    expireCountdowns(world, ClaimLockout, 0.1);
    expect(expiring.has(ClaimLockout)).toBe(false);
    expect(surviving.get(ClaimLockout)?.remainingSeconds).toBeCloseTo(0.4);
  });

  it("is a no-op when nothing is counting down", () => {
    const bystander = world.spawn();
    expireCountdowns(world, ClaimLockout, 0.1);
    expect(bystander.has(ClaimLockout)).toBe(false);
  });
});

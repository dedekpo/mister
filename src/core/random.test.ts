import { createWorld } from "koota";
import { describe, expect, it } from "vitest";
import {
  nextRandom01,
  randomChance,
  randomPick,
  randomRange,
  randomSign,
  seedMatchRandom,
  stepRandom,
} from "./random";

function drawSequence(seed: number, count: number) {
  const world = createWorld();
  seedMatchRandom(world, seed);
  return Array.from({ length: count }, () => nextRandom01(world));
}

describe("stepRandom", () => {
  it("is a pure function of its state", () => {
    const first = stepRandom(42);
    const second = stepRandom(42);
    expect(first).toEqual(second);
    expect(stepRandom(first.state).value).not.toBe(first.value);
  });

  it("produces values in [0, 1)", () => {
    let state = 7;
    for (let draw = 0; draw < 1000; draw += 1) {
      const result = stepRandom(state);
      state = result.state;
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
    }
  });
});

describe("world-backed draws", () => {
  it("replays identically for the same seed", () => {
    expect(drawSequence(42, 100)).toEqual(drawSequence(42, 100));
  });

  it("diverges for different seeds", () => {
    expect(drawSequence(42, 10)).not.toEqual(drawSequence(43, 10));
  });

  it("resets the stream when reseeded", () => {
    const world = createWorld();
    seedMatchRandom(world, 42);
    const first = Array.from({ length: 5 }, () => nextRandom01(world));
    seedMatchRandom(world, 42);
    const second = Array.from({ length: 5 }, () => nextRandom01(world));
    expect(first).toEqual(second);
  });

  it("self-seeds from config when never seeded", () => {
    const world = createWorld();
    expect(() => nextRandom01(world)).not.toThrow();
  });

  it("has a roughly uniform mean", () => {
    const draws = drawSequence(1234, 10000);
    const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe("randomChance", () => {
  it("matches its probability within tolerance", () => {
    const world = createWorld();
    seedMatchRandom(world, 99);
    const trials = 10000;
    let hits = 0;
    for (let trial = 0; trial < trials; trial += 1) {
      if (randomChance(world, 0.3)) hits += 1;
    }
    expect(hits / trials).toBeGreaterThan(0.27);
    expect(hits / trials).toBeLessThan(0.33);
  });
});

describe("randomRange", () => {
  it("stays within bounds", () => {
    const world = createWorld();
    seedMatchRandom(world, 5);
    for (let draw = 0; draw < 1000; draw += 1) {
      const value = randomRange(world, 0.4, 0.9);
      expect(value).toBeGreaterThanOrEqual(0.4);
      expect(value).toBeLessThan(0.9);
    }
  });
});

describe("randomSign", () => {
  it("splits evenly between the two directions", () => {
    const world = createWorld();
    seedMatchRandom(world, 12);
    const trials = 10000;
    let negatives = 0;
    for (let trial = 0; trial < trials; trial += 1) {
      const sign = randomSign(world);
      expect(Math.abs(sign)).toBe(1);
      if (sign === -1) negatives += 1;
    }
    expect(negatives / trials).toBeGreaterThan(0.47);
    expect(negatives / trials).toBeLessThan(0.53);
  });
});

describe("randomPick", () => {
  it("returns undefined for an empty list", () => {
    const world = createWorld();
    expect(randomPick(world, [])).toBeUndefined();
  });

  it("eventually picks every item", () => {
    const world = createWorld();
    seedMatchRandom(world, 8);
    const items = ["a", "b", "c"] as const;
    const picked = new Set<string>();
    for (let draw = 0; draw < 200; draw += 1) {
      picked.add(randomPick(world, items)!);
    }
    expect(picked).toEqual(new Set(items));
  });
});
